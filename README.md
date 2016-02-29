#Backup website to google drive

##*Install*

`npm install`

`Create file configs/setting.js`

##Turn on the Drive API

1. Use [this wizard](https://console.developers.google.com/start/api?id=drive) to create or select a project in the Google Developers Console and automatically turn on the API. Click **Continue**, then **Go to credentials**.

2. At the top of the page, select the **OAuth consent screen** tab. Select an **Email address**, enter a **Product name** if not already set, and click the **Save** button.

3. Select the **Credentials** tab, click the **Add credentials** button and select **OAuth 2.0 client ID**.

4. Select the application type **Other**, enter the name "Drive API Quickstart", and click the **Create** button.

5. Click **OK** to dismiss the resulting dialog.

6. Click the ![download](https://cdn1.iconfinder.com/data/icons/material-core/19/file-download-16.png) (Download JSON) button to the right of the client ID.

7. Move this file to your working directory and rename it `client_secret.json`.

##*Run*

`node index.js your-domain.com`

The first time you run the sample, it will prompt you to authorize access:

Browse to the provided URL in your web browser.

1. If you are not already logged into your Google account, you will be prompted to log in. If you are logged into multiple Google accounts, you will be asked to select one account to use for the authorization.

2. Click the **Accept** button.

3. Copy the code you're given, paste it into the command-line prompt, and press **Enter**.

