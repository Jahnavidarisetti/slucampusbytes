function normalizeCount(value) {
  const count = Number(value ?? 0);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

function normalizeComments(comments) {
  return Array.isArray(comments) ? comments.length : 0;
}

function buildOrganizationSummary({
  organization,
  followers = [],
  posts = [],
  currentUserId = null,
}) {
  const organizationPosts = posts.filter(
    (post) => post.user_id === organization.profile_id
  );
  const organizationFollowers = followers.filter(
    (follower) => follower.organization_id === organization.id
  );

  return {
    id: organization.id,
    profile_id: organization.profile_id,
    username: organization.username,
    name: organization.name,
    description: organization.description ?? null,
    logo_url: organization.logo_url ?? null,
    created_at: organization.created_at ?? null,
    followers_count: organizationFollowers.length,
    posts_count: organizationPosts.length,
    likes_count: organizationPosts.reduce(
      (total, post) => total + normalizeCount(post.likes),
      0
    ),
    comments_count: organizationPosts.reduce(
      (total, post) => total + normalizeComments(post.comments),
      0
    ),
    is_following: Boolean(
      currentUserId &&
        organizationFollowers.some((follower) => follower.user_id === currentUserId)
    ),
  };
}

function buildOrganizationSummaries({
  organizations = [],
  followers = [],
  posts = [],
  currentUserId = null,
}) {
  return organizations
    .map((organization) =>
      buildOrganizationSummary({
        organization,
        followers,
        posts,
        currentUserId,
      })
    )
    .sort((left, right) => {
      const leftName = (left.name || left.username || '').toLowerCase();
      const rightName = (right.name || right.username || '').toLowerCase();
      return leftName.localeCompare(rightName);
    });
}

module.exports = {
  buildOrganizationSummaries,
  buildOrganizationSummary,
};
