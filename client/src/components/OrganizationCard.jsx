import AvatarBadge from "./AvatarBadge";
import OrganizationStat from "./OrganizationStat";

export default function OrganizationCard({
  organization,
  onOpen,
  onFollow,
  followLoading = false,
}) {
  const name = organization.name || organization.username || "Organization";
  const canFollow = !organization.is_following && !organization.is_own_organization;

  const handleFollowClick = (event) => {
    event.stopPropagation();
    onFollow?.(organization);
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(organization)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(organization);
        }
      }}
      className="flex h-full cursor-pointer flex-col rounded-md border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-200"
    >
      <div className="flex items-start gap-4">
        <AvatarBadge src={organization.logo_url} label={name} size="lg" />

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold text-slate-900">
            {name}
          </h2>
          <p className="mt-1 truncate text-sm text-slate-500">
            @{organization.username || "organization"}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            organization.is_following
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {organization.is_following ? "Following" : "Not following"}
        </span>
      </div>

      <p className="mt-4 min-h-[4.5rem] overflow-hidden text-sm leading-6 text-slate-600">
        {organization.description || "This organization has not added a description yet."}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <OrganizationStat label="Followers" value={organization.followers_count} />
        <OrganizationStat label="Posts" value={organization.posts_count} />
        <OrganizationStat label="Likes" value={organization.likes_count} />
        <OrganizationStat label="Comments" value={organization.comments_count} />
      </div>

      <div className="mt-5 flex justify-end">
        {organization.is_own_organization ? (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
            Your organization
          </span>
        ) : canFollow ? (
          <button
            type="button"
            onClick={handleFollowClick}
            disabled={followLoading}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {followLoading ? "Following..." : "Follow"}
          </button>
        ) : (
          <span className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-white">
            Following
          </span>
        )}
      </div>
    </article>
  );
}
