const axios = require('axios');
const FormData = require('form-data');
const api = axios.create({ headers: { 'Content-Type': 'application/json' } });
const form = new FormData();
form.append('file', 'test');
console.log(api.defaults.headers);
api.post('http://localhost:8000/api/v1/health', form).catch(e => console.log(e.response ? e.response.status : e.message));
