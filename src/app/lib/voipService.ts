export async function fetchAuthToken(cliNumber?: string) {
  const res = await fetch('/api/authToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cli_number: cliNumber })
  });
  if (!res.ok) throw new Error('Authentication failed');
  const data = await res.json();
  return data.idToken as string;
}

export async function callAPI(token: string, endpoint: string, payload: any) {
  const res = await fetch('/api/call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, endpoint, payload }),
  });
  if (!res.ok) throw new Error('API call failed');
  return res.json();
}

export async function uploadVoiceFile(token: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/uploadVoice', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) throw new Error('Voice upload failed');
  return res.json();
}
