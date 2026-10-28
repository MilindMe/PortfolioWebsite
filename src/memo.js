// A casual invite gate. Change the code here and rebuild.
export const MEMO_INVITE_CODE='CAMWAD-MILIND';
export const validMemoCode=code=>code.trim().toUpperCase()===MEMO_INVITE_CODE;

export function memoDraftUrl(recipient,name,message){
 const subject='A memory for your portfolio';
 const body=[
  'Hi Milind,',
  'Here’s a memory I’d love you to add to your site.',
  `From: ${name.trim()||'A friend'}`,
  message.trim(),
  'A photo can be attached to this email before sending.',
 ].join('\n\n');
 return `${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
