import axios from 'axios';
import FormData from 'form-data';

const api = axios.create({ headers: { 'Content-Type': 'application/json' } });
const form = new FormData();
form.append('file', 'test');

// Check the interceptors or the request headers just before it goes out
api.interceptors.request.use(config => {
  console.log('Request Content-Type:', config.headers['Content-Type']);
  return config;
});

api.post('http://localhost:8000/api/v1/health', form)
  .then(res => console.log(res.status))
  .catch(e => console.log(e.response ? e.response.status : e.message));
