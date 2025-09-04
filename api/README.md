# OpenRouter API Proxy Setup

This directory contains a serverless function that serves as a proxy to the OpenRouter API. It's designed to keep your OpenRouter API key secure by storing it as an environment variable on the server side rather than exposing it to the client.

## Deployment

The proxy function (`openrouter-proxy.js`) can be deployed to various serverless function platforms such as Vercel, Netlify, AWS Lambda, or similar services.

### Environment Variables

You need to set up the following environment variable on your serverless platform:

-   `OPENROUTER_API_KEY`: Your OpenRouter API key

### Deployment Instructions

#### Vercel

1. Make sure you have the Vercel CLI installed: `npm install -g vercel`
2. Initialize your project with Vercel: `vercel`
3. Set the environment variable:
    ```
    vercel env add OPENROUTER_API_KEY
    ```
4. Deploy the project:
    ```
    vercel --prod
    ```

#### Netlify

1. Create a `netlify.toml` file at the root of your project:

```toml
[build]
  functions = "api"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

2. Set up the environment variable in the Netlify dashboard:

    - Go to Site settings > Build & deploy > Environment variables
    - Add the `OPENROUTER_API_KEY` variable

3. Deploy to Netlify:
    ```
    netlify deploy --prod
    ```

## Local Development

For local development, you can create a `.env` file with the following content:

```
OPENROUTER_API_KEY=your_api_key_here
```

Make sure to add `.env` to your `.gitignore` to prevent it from being committed to version control.
