create or replace function public.toggle_post_like(
  target_post_id uuid,
  actor_user_id uuid
)
returns public.posts
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_post public.posts;
begin
  if auth.uid() is null or auth.uid() <> actor_user_id then
    raise exception 'Not authorized to update likes for this user.';
  end if;

  update public.posts
  set
    liked_by = case
      when actor_user_id = any(liked_by) then array_remove(liked_by, actor_user_id)
      else array_append(liked_by, actor_user_id)
    end,
    likes = greatest(
      cardinality(
        case
          when actor_user_id = any(liked_by) then array_remove(liked_by, actor_user_id)
          else array_append(liked_by, actor_user_id)
        end
      ),
      0
    )
  where id = target_post_id
  returning * into updated_post;

  if updated_post.id is null then
    raise exception 'Post not found.';
  end if;

  return updated_post;
end;
$$;

create or replace function public.append_post_comment(
  target_post_id uuid,
  new_comment jsonb
)
returns public.posts
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_post public.posts;
begin
  if auth.uid() is null then
    raise exception 'Not authorized to update comments.';
  end if;

  if jsonb_typeof(new_comment) <> 'object' then
    raise exception 'Comment must be an object.';
  end if;

  if new_comment->>'user_id' is null or new_comment->>'user_id' <> auth.uid()::text then
    raise exception 'Not authorized to add this comment.';
  end if;

  update public.posts
  set comments = coalesce(comments, '[]'::jsonb) || jsonb_build_array(new_comment)
  where id = target_post_id
  returning * into updated_post;

  if updated_post.id is null then
    raise exception 'Post not found.';
  end if;

  return updated_post;
end;
$$;

revoke execute on function public.toggle_post_like(uuid, uuid) from public;
revoke execute on function public.append_post_comment(uuid, jsonb) from public;

grant execute on function public.toggle_post_like(uuid, uuid) to authenticated;
grant execute on function public.append_post_comment(uuid, jsonb) to authenticated;
