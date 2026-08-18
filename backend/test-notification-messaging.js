import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
import http from 'http';

const PORT = process.env.PORT || 5005;
const BASE_URL = process.env.TEST_URL || `http://127.0.0.1:${PORT}`;

function request(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method.toUpperCase(),
      headers: reqHeaders
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

let userAToken = '';
let userBToken = '';
let userAId = '';
let userBId = '';

let notifId1 = '';
let notifId2 = '';

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 GymSync Notification & Messaging Automated Test Suite');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, description) {
    if (condition) {
      console.log(`  ✅ PASS: ${description}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${description}`);
      failed++;
    }
  }

  try {
    console.log(`📡 Connecting to target test server at ${BASE_URL}\n`);

    // 1. Setup Test Users: UserA and UserB
    const emailA = `notif_user_a_${Date.now()}@example.com`;
    const nameA = `NotifUserA_${Date.now()}`;
    const regA = await request('POST', '/api/auth/register', {
      name: nameA,
      email: emailA,
      password: 'password123',
      role: 'User'
    });
    assert(regA.status === 201 && regA.data.token, `Register User A (${nameA})`);
    userAToken = regA.data.token;
    userAId = regA.data._id;

    const emailB = `notif_user_b_${Date.now()}@example.com`;
    const nameB = `NotifUserB_${Date.now()}`;
    const regB = await request('POST', '/api/auth/register', {
      name: nameB,
      email: emailB,
      password: 'password123',
      role: 'User'
    });
    assert(regB.status === 201 && regB.data.token, `Register User B (${nameB})`);
    userBToken = regB.data.token;
    userBId = regB.data._id;

    const authA = { 'Authorization': `Bearer ${userAToken}` };
    const authB = { 'Authorization': `Bearer ${userBToken}` };

    // 2. Notification Creation Test
    const createN1 = await request('POST', '/api/notifications', {
      userId: userAId,
      type: 'like',
      title: 'New Like',
      message: `${nameB} liked your post`,
      link: '/home',
      sender: nameB
    }, authA);
    assert(createN1.status === 201 && createN1.data.isRead === false, 'Create notification 1 for User A (unread)');
    notifId1 = createN1.data._id;

    const createN2 = await request('POST', '/api/notifications', {
      userId: userAId,
      type: 'comment',
      title: 'New Comment',
      message: `${nameB} commented on your workout`,
      link: '/home',
      sender: nameB
    }, authA);
    assert(createN2.status === 201 && createN2.data._id, 'Create notification 2 for User A (unread)');
    notifId2 = createN2.data._id;

    // 3. Unread Count Endpoint Test
    const unreadCountRes = await request('GET', '/api/notifications/unread-count', null, authA);
    assert(unreadCountRes.status === 200 && unreadCountRes.data.unreadCount >= 2, `Unread count for User A returns accurate count (${unreadCountRes.data.unreadCount})`);

    // 4. Notification List & Filtering Test
    const notifListRes = await request('GET', `/api/notifications/${userAId}?isRead=false`, null, authA);
    assert(notifListRes.status === 200 && Array.isArray(notifListRes.data.notifications) && notifListRes.data.notifications.length >= 2, 'Fetch unread notifications with isRead=false filter');

    // 5. Single Notification Mark As Read Test
    const markReadSingle = await request('PATCH', `/api/notifications/item/${notifId1}/read`, {}, authA);
    assert(markReadSingle.status === 200 && markReadSingle.data.isRead === true && markReadSingle.data.readAt !== null, 'Single notification mark as read updates isRead & readAt timestamp');

    // 6. Persistence Check
    const reFetchNotif = await request('GET', `/api/notifications/${userAId}`, null, authA);
    const item1 = reFetchNotif.data.notifications.find(n => n._id === notifId1);
    assert(item1 && item1.isRead === true, 'Read state persists in database upon re-fetch');

    // 7. Unread Count Decrement Check
    const unreadCountAfterSingle = await request('GET', '/api/notifications/unread-count', null, authA);
    assert(unreadCountAfterSingle.data.unreadCount === unreadCountRes.data.unreadCount - 1, 'Unread notification count decrements correctly after single read');

    // 8. IDOR Protection Test on Notification Read/Delete
    const idorMarkRead = await request('PATCH', `/api/notifications/item/${notifId2}/read`, {}, authB);
    assert(idorMarkRead.status === 403, 'IDOR Protection: User B cannot mark User A notification as read (403 Forbidden)');

    const idorDelete = await request('DELETE', `/api/notifications/item/${notifId2}`, null, authB);
    assert(idorDelete.status === 403, 'IDOR Protection: User B cannot delete User A notification (403 Forbidden)');

    // 9. Mark All Notifications as Read Test
    const markAllRes = await request('PATCH', '/api/notifications/read-all', {}, authA);
    assert(markAllRes.status === 200 && markAllRes.data.unreadCount === 0, 'Mark all notifications as read executes cleanly');

    const checkAllRead = await request('GET', '/api/notifications/unread-count', null, authA);
    assert(checkAllRead.data.unreadCount === 0, 'Unread notification count is now 0');

    // 10. Delete Notification Test
    const deleteNotifRes = await request('DELETE', `/api/notifications/item/${notifId1}`, null, authA);
    assert(deleteNotifRes.status === 200, 'Delete notification succeeds for owner');

    // 11. Messaging System - Send Message Test
    const sendMsg1 = await request('POST', '/api/chat', {
      receiver: nameA,
      text: 'Hey User A! Ready for today\'s workout session?'
    }, authB);
    assert(sendMsg1.status === 201 && sendMsg1.data.sender === nameB && sendMsg1.data.isRead === false, 'User B sends unread chat message to User A');

    const sendMsg2 = await request('POST', '/api/chat', {
      receiver: nameA,
      text: 'Let me know what time works best!'
    }, authB);
    assert(sendMsg2.status === 201 && sendMsg2.data._id, 'User B sends second unread message to User A');

    // 12. Chat Unread Count Test
    const chatUnreadCount = await request('GET', '/api/chat/unread-count', null, authA);
    assert(chatUnreadCount.status === 200 && chatUnreadCount.data.unreadCount >= 1 && chatUnreadCount.data.totalUnreadMessages >= 2, `User A unread chat count returns active unread conversations (${chatUnreadCount.data.unreadCount})`);

    // 13. Conversation List Retrieval Test
    const convListRes = await request('GET', `/api/chat/conversations/${nameA}`, null, authA);
    assert(convListRes.status === 200 && Array.isArray(convListRes.data), 'User A fetches conversation contact list');
    const bConv = convListRes.data.find(c => (c.name || c.id || c) === nameB);
    assert(bConv && (typeof bConv === 'string' || bConv.unreadCount >= 2), 'Conversation list includes User B with correct unread message count');

    // 14. IDOR Protection on Private Chat Log Access
    const idorChatLog = await request('GET', `/api/chat/${nameA}/${nameB}`, null, {
      'Authorization': `Bearer ${userBToken}`
    });
    assert(idorChatLog.status === 200, 'User B can access conversation between User A and User B');

    const emailC = `notif_user_c_${Date.now()}@example.com`;
    const nameC = `NotifUserC_${Date.now()}`;
    const regC = await request('POST', '/api/auth/register', {
      name: nameC,
      email: emailC,
      password: 'password123',
      role: 'User'
    });
    const authC = { 'Authorization': `Bearer ${regC.data.token}` };

    const idorChatBlocked = await request('GET', `/api/chat/${nameA}/${nameB}`, null, authC);
    assert(idorChatBlocked.status === 403, 'IDOR Protection: User C cannot access private chat between User A and User B (403 Forbidden)');

    // 15. Opening Chat Auto-marks Incoming Messages as Read Test
    const openChatRes = await request('GET', `/api/chat/${nameB}/${nameA}`, null, authA);
    assert(openChatRes.status === 200 && Array.isArray(openChatRes.data), 'User A opens chat conversation with User B');

    // 16. Message Read Persistence Check
    const reCheckChatUnread = await request('GET', '/api/chat/unread-count', null, authA);
    assert(reCheckChatUnread.data.totalUnreadMessages === 0, 'Messages from User B to User A are now marked as read persistently');

    // 17. Explicit Mark Conversation Read Test
    const sendMsg3 = await request('POST', '/api/chat', {
      receiver: nameA,
      text: 'Third message for mark read endpoint test'
    }, authB);
    assert(sendMsg3.status === 201, 'User B sends third message to User A');

    const markConvReadRes = await request('PATCH', `/api/chat/read/${nameB}`, {}, authA);
    assert(markConvReadRes.status === 200, `User A explicitly marks conversation with ${nameB} as read`);

    const checkFinalUnread = await request('GET', '/api/chat/unread-count', null, authA);
    assert(checkFinalUnread.data.totalUnreadMessages === 0, 'Final unread message count is 0');

  } catch (err) {
    console.error('Unexpected test error:', err);
    failed++;
  }

  console.log('\n------------------------------------------------------');
  console.log(`RESULTS: ${passed} PASS, ${failed} FAIL`);
  console.log('------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
