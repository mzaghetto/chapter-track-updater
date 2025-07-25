import axios from 'axios';

export async function healthCheckJob() {
  const healthCheckUrl = process.env.API_HEALTH_CHECK_URL;

  if (!healthCheckUrl) {
    console.warn('API_HEALTH_CHECK_URL is not set. Skipping health check.');
    return;
  }

  try {
    const response = await axios.get(healthCheckUrl);
    if (response.status === 200 && response.data.status === 'ok') {
      console.log(`API Health Check: OK (${healthCheckUrl})`);
    } else {
      console.error(`API Health Check: FAILED - Status: ${response.status}, Data: ${JSON.stringify(response.data)}`);
    }
  } catch (error: any) {
    console.error(`API Health Check: ERROR - ${error.message}`);
  }
}
