# Embedding Google Apps Script Web App in Webpage

## HTML Code to Add to Your Webpage

To embed the MRI INVOICE Google Apps Script web application in an iframe on your webpage, add the following HTML code:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Website Title</title>
</head>
<body>
    <!-- Replace YOUR_DEPLOYMENT_URL with your actual Google Apps Script deployment URL -->
    <iframe
        src="YOUR_DEPLOYMENT_URL"
        width="100%"
        height="600"
        frameborder="0"
        style="border: none; width: 100%; min-height: 600px;"
        allowfullscreen
        sandbox="allow-scripts allow-forms allow-same-origin allow-top-navigation allow-popups">
    </iframe>

    <script>
        // Optional: Resize iframe based on content
        window.addEventListener('message', function(event) {
            if (event.data.type === 'resize') {
                const iframe = document.querySelector('iframe');
                if (iframe) {
                    iframe.style.height = event.data.height + 'px';
                }
            }
        });
    </script>
</body>
</html>
```

## Instructions

1. **Replace `YOUR_DEPLOYMENT_URL`** with your actual Google Apps Script deployment URL
   - You can find this in the Google Apps Script editor under "Deploy" > "New deployment"
   - Choose "Web app" as the type
   - Copy the deployment URL

2. **Adjust dimensions** as needed:
   - `width="100%"` makes it responsive
   - `height="600"` sets a minimum height (adjust as needed)
   - The CSS `min-height: 600px` ensures minimum height

3. **Security attributes**:
   - `sandbox` attribute allows necessary permissions for the web app to function
   - `allowfullscreen` allows fullscreen mode if needed

4. **Styling**:
   - `frameborder="0"` removes border
   - `style="border: none;"` ensures no border
   - `width: 100%` makes it responsive

## Alternative Simple Version

If you just want to add the iframe to an existing webpage:

```html
<iframe
    src="YOUR_DEPLOYMENT_URL"
    width="100%"
    height="800"
    frameborder="0"
    style="border: none; width: 100%; min-height: 800px;"
    allowfullscreen
    sandbox="allow-scripts allow-forms allow-same-origin allow-top-navigation allow-popups">
</iframe>
```

## Important: Redeploy After Changes

**CRITICAL**: After making changes to `Code.js`, you MUST redeploy your Google Apps Script:

1. Open Google Apps Script editor
2. Go to **Deploy** → **Manage deployments**
3. Click **Edit** (pencil icon) on your existing deployment
4. Select **Version: New version**
5. Click **Deploy**
6. Copy the new deployment URL

## Troubleshooting

If the iframe still doesn't load, try these solutions:

### 1. Check Browser Console
Open browser developer tools (F12) and check for errors in the console.

### 2. Alternative Iframe Code (Less Restrictive)
```html
<iframe
    src="YOUR_DEPLOYMENT_URL"
    width="100%"
    height="800"
    frameborder="0"
    style="border: none; width: 100%; min-height: 800px;"
    allowfullscreen
    sandbox="allow-scripts allow-forms allow-same-origin allow-top-navigation allow-popups allow-modals">
</iframe>
```

### 3. Test Direct Access First
- Open your deployment URL directly in a new browser tab
- Make sure the app loads correctly without iframe
- Check if there are any JavaScript errors

### 4. CORS Issues
If you see CORS errors, the issue might be with external resources. The app is configured to allow common CDNs.

### 5. Alternative Approach - Embed as Link
If iframe doesn't work, consider opening in a new tab:
```html
<a href="YOUR_DEPLOYMENT_URL" target="_blank" style="display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">
    Open MRI INVOICE Application
</a>
```

## Notes

- Make sure your Google Apps Script is deployed and accessible
- The iframe will display your MRI INVOICE application
- The application should load with iframe support enabled (as configured in Code.js)
- Test the embedding to ensure proper functionality
- If issues persist, try the alternative iframe code above
