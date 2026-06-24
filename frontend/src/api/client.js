import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const listProfiles = () => api.get('/profiles').then(r => r.data)
export const getProfile = id => api.get(`/profiles/${id}`).then(r => r.data)
export const createProfile = body => api.post('/profiles', body).then(r => r.data)
export const setParameter = (profileId, componentId, name, value) =>
  api.patch(`/profiles/${profileId}/components/${componentId}/parameters/${name}`, { value }).then(r => r.data)
export const validateProfile = id => api.post(`/profiles/${id}/validate`).then(r => r.data)
export const exportIFC = id => api.post(`/profiles/${id}/export/ifc`).then(r => r.data)
export const sendAICommand = (id, command, mode) =>
  api.post(`/profiles/${id}/ai`, { command, mode }).then(r => r.data)
export const applyPlan = (id, command, operations) =>
  api.post(`/profiles/${id}/ai/apply`, { command, operations }).then(r => r.data)
