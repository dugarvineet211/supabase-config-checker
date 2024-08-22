## Supabase Config Checker

This app is used to check the config for your supabase application
It will check the following things and wherever possible will give you a solution for the issues found in your configuration or resolve it if possible. 
	1. Row Level Security enabled for all tables - If not, then will enable it
	2. MFA Status for users - If users have not enabled MFA, it will return a list of  userIds whose status is false, along with a guide doc to enable it.
	3. Point In Time Recovery Status for project database - It  will return boolean value based on your project's database PITR status. It will also return a link to redirect you to the dashboard for your project to enable PITR. 

### Tech Stack
1. Node.js
2. Express
3. Postgres
4. React
5. Axios
6. Prisma
### Project Setup

1. Go to backend folder and run `npm install` which will install all dependencies of the app.
2. Copy the `.env.example` file and make a `.env` file of the same contents
3. There add your local postgres database configuration URL
4. Run `npx prisma migrate dev` to generate all tables required
5. Run `node app.js`  to run the app on port 3001

For FE
	1. Go to frontend folder of the app.
	2. Run `npm install` to install all dependencies.
	3. Run `npm run start` to start the application
	4. The FE should be running on `http://localhost:3000/`

### Steps to test

1. Hit the api `localhost:3001/checks/run-system-checks/:projectReference`  and in the headers, under Authorization pass, `Bearer YOUR_SUPABASE_ACCESS_KEY` which can be found in `https://supabase.com/dashboard/account/tokens` 
2. This token is all you need to test all your configurations using this app.
