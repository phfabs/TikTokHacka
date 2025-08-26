import axios from 'axios';
import { API_BASE_URL } from './apiConfig';


export const createSkillPlan = async (skillName, difficulty, token) => {
  const body = { skill_name: skillName };
  if (difficulty) {
    body.difficulty = difficulty.toLowerCase();
  }
  const response = await axios.post(`${API_BASE_URL}/api/v1/plans/skills`,
    body,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

export const createHabitPlan = async (title, category, color, token, startDate, endDate, reminderTime, customDays, reminderMessage) => {
  const body = { title, category };
  if (color) body.color = color;
  if (startDate) body.start_date = startDate;
  if (endDate) body.end_date = endDate;
  if (reminderTime) body.reminder_time = reminderTime;
  if (customDays && customDays.length > 0) body.custom_days = customDays;
  if (reminderMessage) body.reminder_message = reminderMessage;
  const response = await axios.post(`${API_BASE_URL}/api/v1/plans/habits`,
    body,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

export const getAllPlans = async (token) => {
  const response = await axios.get(`${API_BASE_URL}/api/v1/plans/`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.data;
};

export const getSkillById = async (skillId, token) => {
  const response = await axios.get(`${API_BASE_URL}/api/v1/plans/skills/${skillId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.data;
};

export const deleteSkill = async (skillId, token) => {
  const response = await axios.delete(`${API_BASE_URL}/api/v1/plans/skills/${skillId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.data;
};

export const deleteHabit = async (habitId, token) => {
  const response = await axios.delete(`${API_BASE_URL}/api/v1/plans/habits/${habitId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.data;
};

export const recordHabitCheckin = async (habitId, dateIso, token) => {
  // Ensure date is in YYYY-MM-DD format (no time component)
  const dateOnly = dateIso.split('T')[0];
  const payload = { 
    date: dateOnly, 
    completed: true 
  };
  
  console.log('API call payload:', payload);
  console.log('API call URL:', `${API_BASE_URL}/api/v1/plans/habits/${habitId}/checkin`);
  console.log('Headers:', { Authorization: `Bearer ${token ? token.substring(0, 20) + '...' : 'missing'}` });
  
  const response = await axios.post(
    `${API_BASE_URL}/api/v1/plans/habits/${habitId}/checkin`,
    payload,
    { 
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      } 
    }
  );
  return response.data;
};

export const markSkillDayComplete = async (skillId, dayNumber, token) => {
  const response = await axios.patch(
    `${API_BASE_URL}/api/v1/plans/skills/${skillId}/days/${dayNumber}/complete`, 
    {}, 
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  return response.data;
};

export const undoSkillDayComplete = async (skillId, dayNumber, token) => {
  const response = await axios.patch(
    `${API_BASE_URL}/api/v1/plans/skills/${skillId}/days/${dayNumber}/undo`, 
    {}, 
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  return response.data;
}; 

export const getHabitById = async (habitId, token) => {
  const response = await axios.get(`${API_BASE_URL}/api/v1/plans/habits/${habitId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const updateSkill = async (skillId, data, token) => {
  const response = await axios.patch(`${API_BASE_URL}/api/v1/plans/skills/${skillId}`,
    data,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

export const updateHabit = async (habitId, data, token) => {
  const response = await axios.patch(`${API_BASE_URL}/api/v1/plans/habits/${habitId}`,
    data,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

export const refreshSkillImage = async (skillId, token) => {
  const response = await axios.patch(`${API_BASE_URL}/api/v1/plans/skills/${skillId}/refresh-image`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

export const getUserStats = async (token) => {
  const response = await axios.get(`${API_BASE_URL}/api/v1/plans/stats`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
}; 