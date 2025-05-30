
// Open browser console and run this to clear user data:
console.log('Clearing all user data from localStorage...');
['accessToken', 'refreshToken', 'userEmail', 'userName', 'userPicture', 'userRole', 'currentUser', 'clientId', 'clientSecret', 'driveUrl'].forEach(key => {
  console.log('Removing:', key, 'Value was:', localStorage.getItem(key));
  localStorage.removeItem(key);
});
console.log('All user data cleared. Please refresh the page and log in again.');

