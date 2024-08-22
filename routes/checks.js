const express = require('express');
const router = express.Router();
const { PrismaClient } = require ('@prisma/client');
const prisma = new PrismaClient();
const {encrypt, decrypt} = require('../helpers/helper');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

function initializeSupabase(projectRef, key) {
    let url = `https://${projectRef}.supabase.co`;
    let client = createClient(url, key);
    return client;
  }
  
  // function to fetch supabase client
  async function getClient(projectRef, accessKey) {
    try {
        let projectData = await prisma.project.findFirst({
            where: {
                projectRef: `${projectRef}`
            }
        });
        if (!accessKey && !projectData && projectRef) {
            throw new Error('Please provide an accessKey with your project reference since we dont have you in our system yet!');
        } else if (accessKey && projectRef && !projectData) {
            await prisma.project.create({
                data: {
                    accessKey: encrypt(accessKey),
                    projectRef: projectRef
                }
            });
        } else accessKey = decrypt(projectData.accessKey);
          let apiKeyFetchData = await axios.get(`https://api.supabase.com/v1/projects/${projectRef}/api-keys`, {
              headers: {
                  Authorization: `Bearer ${accessKey}`
              }
          });
          let apiKeyData = apiKeyFetchData.data[1];
          let projectRoleKey = apiKeyData['api_key'];
          let client = initializeSupabase(projectRef, projectRoleKey);
          return {client, projectData, key: accessKey};
    } catch (e) {
        console.log(e);
        throw new Error(e);
    }
  }
  
  // function to check mfa for users
  async function listMfa(client, projectData) {
    try {
        let userData = await client.auth.admin.listUsers();
        let userCount = userData.data.users.length;
        let failedCount = 0;
        let userArray = [];
        for (let user of userData.data.users) {
            let mfaFactor = await client.auth.admin.mfa.listFactors({
                userId: user.id
            })
            if (mfaFactor.data.factors.length == 0) {
              failedCount++;
              userArray.push({userId: user.id, mfaStatus: false});
            }
        }
        await prisma.log.create({
          data: {
              event: 'User MFA Check',
              successCount: (userCount-failedCount),
              failureCount: failedCount,
              suggestedHelp: 'Can enroll app users to MFA using a TOTP (Time based one time password) method',
              logMessage: 'MFA Checks Run',
              projectId: projectData.id
          }
        });
        return userArray;
    } catch(e) {
        console.log(e);
        throw new Error('Something went wrong!');
    }
  }
  
  // function to check database PITR status
  async function getDatabasePITRStatus(projectRef, accessKey, projectData) {
      try {
        let backupData = await axios.get(`https://api.supabase.com/v1/projects/${projectRef}/database/backups`, {
            headers: {
                Authorization: `Bearer ${accessKey}`
            }
        });
        if(!backupData.data.pitr_enabled) {
          await prisma.log.create({
              data: {
                  event: 'Database Point in Time Recovery Check',
                  successCount: 0,
                  failureCount: 1,
                  suggestedHelp: `Can go to the project dashboard and enable PITR -> https://supabase.com/dashboard/project/${projectRef}/database/backups/pitr`,
                  logMessage: 'PITR Check Run',
                  projectId: projectData.id
              }
            });
            return false;
        }
        await prisma.log.create({
          data: {
              event: 'Database Point in Time Recovery Check',
              successCount: 1,
              failureCount: 0,
              message: 'PITR already enabled',
              logMessage: 'PITR Check Run',
              projectId: projectData.id
          }
        });
        return true;
      } catch(e) {
        console.log(e);
        throw new Error('Something went wrong!');
      }
  }

  //function to get Row level security for tables
  async function getRLS(client, projectRef, projectData, accessKey) {
 try {
    let queryData = await axios.post(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        query: `select relname, relrowsecurity, relforcerowsecurity
                from pg_class
                join pg_catalog.pg_namespace n on n.oid = pg_class.relnamespace
                where n.nspname = 'public' and relkind = 'r';`
    }, {
        headers: {
            Authorization: `Bearer ${accessKey}`
        }
    });
   let result = [];
   let totalCount = queryData.data.length;
   let failedCount = 0;
   for (let obj of queryData.data) {
    if(!obj.relrowsecurity) {
        failedCount++;
        result.push({tableName: obj.relname, rlsStatus: obj.relrowsecurity, 
            resolution: `System has run the following command on your Supabase SQL Editor to enable RLS`,
            command: `alter table ${obj.relname} enable row level security;`
        });
        await axios.post(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
            query: `alter table ${obj.relname} enable row level security;`
        }, {
            headers: {
                Authorization: `Bearer ${accessKey}`
            }
        });
    }
   }
   await prisma.log.create({
    data: {
        successCount: (totalCount-failedCount),
        failureCount: failedCount,
        suggestedHelp: failedCount > 0 ? `Running the following command "alter table 'table_name' enable row level security;" for all missing tables`: 'No action needed',
        event: 'Table RLS Checks',
        logMessage: 'RLS Checks Run',
        message: failedCount > 0 ? 'Please enable RLS checks and its policies' : 'Tables have RLS already enabled',
        projectId: projectData.id
    }
   })
   return result; 
 } catch(e) {
    console.log(e);
    throw new Error('Something went wrong!');
 }
  }

router.post('/run-system-checks/:projectRef', async (req, res, next) => {
  try {
    let projectRef = req.params.projectRef;
    let accessKey = req.body.accessKey ? req.body.accessKey : null;
    let {client, projectData, key} = await getClient(projectRef, accessKey);
    if (!accessKey) 
        accessKey = key;
    let mfaStatus = await listMfa(client, projectData);
    let mfaData = {};
    mfaData.mfaStatus = mfaStatus;
    if (mfaStatus.length > 0) {
        mfaData.resolution = 'Can enroll app users to MFA using a TOTP (Time based one time password) method'
        mfaData.link = 'https://supabase.com/docs/guides/auth/auth-mfa'
    }
    let pitrStatus = await getDatabasePITRStatus(projectRef, accessKey, projectData);
    let pitrData = {};
    pitrData.pitrStatus = pitrStatus;
    if(!pitrStatus) {
        pitrData.resolution = `Please go to the project dashboard and enable PITR`
        pitrData.link = `https://supabase.com/dashboard/project/${projectRef}/database/backups/pitr`
    }
    let rlsStatus = await getRLS(client, projectRef, projectData, accessKey);
    let rlsData = {};
    rlsData.rlsStatus = rlsStatus;
    res.status(200);
    res.send({mfaData: mfaData, pitrData: pitrData, rlsData: rlsData});
  } catch(e) {
    console.log(e);
    next(e.message);
  }
});
module.exports = router;