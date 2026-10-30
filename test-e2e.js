/**
 * Complete End-to-End Test Suite for CodeAlpha Task 2 Social Media Platform
 * Verifies:
 * - User Registration & Authentication (JWT + Password Hashing)
 * - User Profiles & Stats
 * - Post Creation, Feed Retrieval & Search
 * - Dynamic Likes Toggle & Count Verification
 * - Interactive Comments System & Comment Deletion
 * - Relational Follower / Following System & Feed Filtering
 */

const { app, server } = require('./server');

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('🧪 Starting Full E2E Automated Verification Test Suite...\n');
  let failures = 0;
  let successes = 0;

  function assert(condition, message) {
    if (!condition) {
      console.error(`❌ FAIL: ${message}`);
      failures++;
    } else {
      console.log(`✅ PASS: ${message}`);
      successes++;
    }
  }

  try {
    // 1. Health check
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200 && healthData.status === 'online', 'Server health check passed');

    // 2. Register Test User A
    const userAData = {
      username: 'e2e_user_a',
      email: 'usera@e2etest.com',
      password: 'password123',
      name: 'Alice Tester',
      bio: 'Full stack test engineer'
    };
    const regARes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userAData)
    });
    const regA = await regARes.json();
    assert(regARes.status === 201 && regA.token && regA.user.username === 'e2e_user_a', 'User A registered with JWT');
    const tokenA = regA.token;
    const userAId = regA.user.id;

    // 3. Register Test User B
    const userBData = {
      username: 'e2e_user_b',
      email: 'userb@e2etest.com',
      password: 'password123',
      name: 'Bob Tester',
      bio: 'Mobile and frontend engineer'
    };
    const regBRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userBData)
    });
    const regB = await regBRes.json();
    assert(regBRes.status === 201 && regB.token && regB.user.username === 'e2e_user_b', 'User B registered with JWT');
    const tokenB = regB.token;
    const userBId = regB.user.id;

    // 4. Test User A Login
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail: 'e2e_user_a', password: 'password123' })
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200 && loginData.user.name === 'Alice Tester', 'User A login verified');

    // 5. User A creates a post
    const postRes = await fetch(`${BASE_URL}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        content: 'Hello World from Alice! Welcome to PulseSphere #codealpha #fullstack',
        imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500'
      })
    });
    const postData = await postRes.json();
    assert(postRes.status === 201 && postData.post && postData.post.id, 'User A created post successfully');
    const postId = postData.post.id;

    // 6. User B fetches feed and sees User A's post
    const feedRes = await fetch(`${BASE_URL}/api/posts`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const feedData = await feedRes.json();
    const foundPost = feedData.posts.find((p) => p.id === postId);
    assert(foundPost && foundPost.username === 'e2e_user_a', 'User B retrieved post in main feed');

    // 7. User B likes User A's post
    const likeRes1 = await fetch(`${BASE_URL}/api/posts/${postId}/like`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const likeData1 = await likeRes1.json();
    assert(likeData1.success && likeData1.is_liked === true && likeData1.likes_count === 1, 'User B liked post, count is 1');

    // 8. User B toggles like (unlikes) then likes again
    const unlikeRes = await fetch(`${BASE_URL}/api/posts/${postId}/like`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const unlikeData = await unlikeRes.json();
    assert(unlikeData.is_liked === false && unlikeData.likes_count === 0, 'User B unliked post, count returned to 0');

    const relikeRes = await fetch(`${BASE_URL}/api/posts/${postId}/like`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const relikeData = await relikeRes.json();
    assert(relikeData.is_liked === true && relikeData.likes_count === 1, 'User B re-liked post dynamically');

    // 9. User B adds a comment to User A's post
    const commentRes = await fetch(`${BASE_URL}/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({ content: 'Awesome post Alice! Testing comment system.' })
    });
    const commentData = await commentRes.json();
    assert(commentRes.status === 201 && commentData.comment && commentData.comments_count === 1, 'User B added comment, comments_count is 1');
    const commentId = commentData.comment.id;

    // 10. Fetch comments for post
    const getCommentsRes = await fetch(`${BASE_URL}/api/posts/${postId}/comments`);
    const getCommentsData = await getCommentsRes.json();
    assert(getCommentsData.comments.length >= 1 && getCommentsData.comments[0].content.includes('Awesome post Alice'), 'Comment retrieved with author metadata');

    // 11. User B follows User A
    const followRes = await fetch(`${BASE_URL}/api/users/${userAId}/follow`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const followData = await followRes.json();
    assert(followData.success && followData.is_following === true && followData.followers_count === 1, 'User B follows User A (followers count = 1)');

    // 12. User B checks Following feed
    const followingFeedRes = await fetch(`${BASE_URL}/api/posts?feed=following`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const followingFeedData = await followingFeedRes.json();
    const hasAlicePostInFollowing = followingFeedData.posts.some((p) => p.id === postId);
    assert(hasAlicePostInFollowing, 'User A post appears in User B following feed');

    // 13. User A checks their profile
    const profileRes = await fetch(`${BASE_URL}/api/users/e2e_user_a`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const profileData = await profileRes.json();
    assert(
      profileData.user.followers_count === 1 &&
      profileData.user.is_following === true &&
      profileData.user.posts_count >= 1,
      'User A profile stats and is_following relationship verified'
    );

    // 14. User A updates profile
    const updateProfileRes = await fetch(`${BASE_URL}/api/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        name: 'Alice Tester (Lead Dev)',
        bio: 'Updated bio: Building full-stack apps with CodeAlpha!'
      })
    });
    const updateProfileData = await updateProfileRes.json();
    assert(updateProfileData.user.name === 'Alice Tester (Lead Dev)', 'User A profile bio and name updated');

    // 15. User B deletes their comment
    const delCommentRes = await fetch(`${BASE_URL}/api/comments/${commentId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const delCommentData = await delCommentRes.json();
    assert(delCommentData.success && delCommentData.comments_count === 0, 'Comment deleted successfully, count updated');

    // 16. User A deletes their post
    const delPostRes = await fetch(`${BASE_URL}/api/posts/${postId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const delPostData = await delPostRes.json();
    assert(delPostData.success, 'Post deleted successfully by author');

    // Summary
    console.log(`\n========================================`);
    console.log(`Test Results: ${successes} PASSED, ${failures} FAILED`);
    console.log(`========================================\n`);

    if (failures > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  } finally {
    server.close();
  }
}

runTests();
