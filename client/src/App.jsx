import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import AvatarBadge from "./components/AvatarBadge";
import PostCard from "./components/PostCard";
import OrgSearchBar from "./components/OrgSearchBar";
import {
  fetchPosts,
  createPost,
  rewritePostDescription,
  updatePost,
} from "./api/config";
import { fetchOrganizationByProfileId } from "./api/organizations";
import {
  syncOrganizationFromProfile,
  syncProfileFromMetadata,
} from "./lib/supabaseAuth";
import {
  ACCEPTED_IMAGE_MIME_TYPES,
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_TONE_OPTIONS,
  MAX_IMAGE_SIZE_BYTES,
  TITLE_MAX_LENGTH,
  getTodayDateString,
  isNetworkFetchError,
  isSchemaCompatibilityError,
  isValidImageFile,
  validateComposerInput,
} from "./lib/postComposerUtils";

const POST_CONTENT_PREFIX = "CB_POST_V1::";

function buildPostContentPayload({ title, description, image, eventDate }) {
  if (!eventDate) return description;

  return `${POST_CONTENT_PREFIX}${encodeURIComponent(
    JSON.stringify({
      title,
      description,
      image: image || null,
      eventDate,
    })
  )}`;
}

function newClientUuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function parsePostContent(content) {
  if (typeof content !== "string") {
    return { title: "", description: "", image: null };
  }

  if (!content.startsWith(POST_CONTENT_PREFIX)) {
    return { title: "", description: content, image: null };
  }

  try {
    const rawPayload = content.slice(POST_CONTENT_PREFIX.length);
    const parsed = JSON.parse(decodeURIComponent(rawPayload));
    return {
      title: typeof parsed.title === "string" ? parsed.title : "",
      description: typeof parsed.description === "string" ? parsed.description : "",
      image: typeof parsed.image === "string" ? parsed.image : null,
      eventDate: typeof parsed.eventDate === "string" ? parsed.eventDate : null,
    };
  } catch {
    return { title: "", description: content, image: null, eventDate: null };
  }
}

function mapPostFromApi(post) {
  const embeddedProfile = Array.isArray(post.profiles)
    ? post.profiles[0]
    : post.profiles;
  const profileEmail =
    typeof embeddedProfile?.email === "string"
      ? embeddedProfile.email.trim().toLowerCase()
      : "";
  const emailName = profileEmail ? profileEmail.split("@")[0] : "";

  const parsedLegacy = parsePostContent(post.content);
  return {
    id: post.id,
    userId: post.user_id ?? post.userId ?? null,
    role:
      post.role ??
      (typeof embeddedProfile?.role === "string" ? embeddedProfile.role : null),
    avatarUrl:
      (typeof post.avatar_url === "string" && post.avatar_url.trim()) ||
      (typeof embeddedProfile?.avatar_url === "string" &&
        embeddedProfile.avatar_url.trim()) ||
      null,
    club_name:
      (typeof post.club_name === "string" && post.club_name.trim()) || null,
    organization_name:
      (typeof post.organization_name === "string" && post.organization_name.trim()) ||
      (typeof embeddedProfile?.full_name === "string" &&
        embeddedProfile.full_name.trim()) ||
      (typeof embeddedProfile?.username === "string" &&
        embeddedProfile.username.trim()) ||
      emailName ||
      (typeof post.club_name === "string" && post.club_name.trim()) ||
      "CampusBytes",
    title:
      (typeof post.title === "string" && post.title.trim()) ||
      parsedLegacy.title ||
      "",
    content:
      (typeof post.description === "string" && post.description.trim()) ||
      parsedLegacy.description ||
      post.content ||
      "",
    image:
      (typeof post.image_url === "string" && post.image_url.trim()) ||
      parsedLegacy.image ||
      null,
    eventDate:
      (typeof post.eventDate === "string" && post.eventDate) ||
      (typeof post.event_date === "string" && post.event_date) ||
      parsedLegacy.eventDate ||
      null,
    likes: Number(post.likes ?? 0),
    liked_by: Array.isArray(post.liked_by) ? post.liked_by : [],
    comments: Array.isArray(post.comments)
      ? post.comments.map((comment) => ({
          id: comment?.id ?? newClientUuid(),
          text: typeof comment?.text === "string" ? comment.text : "",
          user_id:
            typeof comment?.user_id === "string" ? comment.user_id : null,
          author_name:
            (typeof comment?.author_name === "string" && comment.author_name.trim()) ||
            (typeof comment?.author === "string" && comment.author.trim()) ||
            "Anonymous",
        }))
      : [],
    created_at: post.created_at || post.createdAt || null,
    showComments: false,
  };
}

function mergePersistedPost(previousPost, persistedPost) {
  const mapped = mapPostFromApi(persistedPost);
  const previousOrgName =
    typeof previousPost?.organization_name === "string"
      ? previousPost.organization_name.trim()
      : "";
  const mappedOrgName =
    typeof mapped.organization_name === "string"
      ? mapped.organization_name.trim()
      : "";
  const shouldPreservePreviousOrgName =
    previousOrgName &&
    (!mappedOrgName || mappedOrgName === "CampusBytes");

  return {
    ...mapped,
    organization_name: shouldPreservePreviousOrgName
      ? previousOrgName
      : mapped.organization_name,
    showComments: previousPost?.showComments ?? false,
  };
}

const toggleComments = (posts, id) => {
  return posts.map((post) =>
    post.id === id
      ? { ...post, showComments: !post.showComments }
      : post
  );
};

const addComment = (posts, postId, commentText, author = {}) => {
  if (!commentText.trim()) return posts;

  const newComment = {
    id: newClientUuid(),
    text: commentText,
    user_id: author.userId ?? null,
    author_name: author.name ?? "Anonymous",
  };

  return posts.map((post) =>
    post.id === postId
      ? { ...post, comments: [...post.comments, newComment] }
      : post
  );
};

function App() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postEventDate, setPostEventDate] = useState("");
  const [postDescription, setPostDescription] = useState("");
  const [descriptionTone, setDescriptionTone] = useState("professional");
  const [isRewritingDescription, setIsRewritingDescription] = useState(false);
  const [postImageFile, setPostImageFile] = useState(null);
  const [postImagePreview, setPostImagePreview] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  
  async function loadProfile(userId, metadata = {}) {
    setIsProfileLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, full_name, email, role, avatar_url, organization_description")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data) {
      let syncedProfile = data;

      try {
        syncedProfile = await syncProfileFromMetadata(userId, data, metadata);
      } catch (syncError) {
        console.warn("Unable to sync profile from metadata:", syncError.message);
      }

      try {
        await syncOrganizationFromProfile(userId, syncedProfile, metadata);
      } catch (syncError) {
        console.warn("Unable to sync organization profile:", syncError.message);
      }

      const roleFromMetadata = metadata.role?.toString() || "";
      const usernameFromMetadata = metadata.username?.toString() || "";
      const profileValue = {
        ...syncedProfile,
        role:
          syncedProfile.role && syncedProfile.role.toLowerCase() !== "user"
            ? syncedProfile.role
            : roleFromMetadata || syncedProfile.role,
        username:
          syncedProfile.username ||
          usernameFromMetadata ||
          syncedProfile.full_name ||
          syncedProfile.email,
      };
      setProfile(profileValue);
    } else {
      setProfile({
        id: userId,
        username: metadata.username || metadata.email || "User",
        full_name: metadata.full_name || "",
        email: metadata.email || "",
        role: metadata.role || "user",
        avatar_url: metadata.avatar_url || null,
      });
    }

    setIsProfileLoading(false);
  }

  useEffect(() => {
    const initSession = async () => {
      const { data } = await supabase.auth.getSession();
      const nextSession = data.session ?? null;
      setSession(nextSession);

      if (nextSession?.user?.id) {
        await loadProfile(nextSession.user.id, nextSession.user.user_metadata ?? {});
      }
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const nextValue = nextSession ?? null;
      setSession(nextValue);

      if (nextValue?.user?.id) {
        loadProfile(nextValue.user.id, nextValue.user.user_metadata ?? {}).catch(
          (err) => {
            console.warn("Unable to load profile after auth change:", err.message);
            setProfile(null);
          }
        );
      } else {
        setProfile(null);
        setIsProfileLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setIsProfileMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isProfileMenuOpen]);

  useEffect(() => {
    const loadPosts = async () => {
      try {
        const response = await fetchPosts();
        const postsPayload = Array.isArray(response)
          ? response
          : response.posts ?? [];

        setPosts(postsPayload.map(mapPostFromApi));
      } catch (err) {
        console.warn("Unable to load posts from API:", err.message);

        try {
          const selectAttempts = [
            "id, user_id, content, title, description, image_url, event_date, created_at, likes, liked_by, comments, profiles(full_name, username, email, avatar_url, role)",
            "id, user_id, content, title, description, image_url, event_date, created_at, likes, liked_by, comments, profiles(username, email, avatar_url, role)",
            "id, user_id, content, title, description, image_url, event_date, created_at, likes, liked_by, comments",
            "id, user_id, content, title, description, image_url, event_date, created_at, likes",
            "id, user_id, content, title, description, image_url, created_at, likes, liked_by, comments, profiles(full_name, username, email, avatar_url, role)",
            "id, user_id, content, title, description, image_url, created_at, likes, liked_by, comments, profiles(username, email, avatar_url, role)",
            "id, user_id, content, title, description, image_url, created_at, likes, liked_by, comments",
            "id, user_id, content, title, description, image_url, created_at, likes",
            "id, user_id, content, created_at, likes, liked_by, comments",
            "id, user_id, content, created_at, likes",
            "id, user_id, content, created_at",
            "id, user_id, content, likes, liked_by, comments",
            "id, user_id, content, likes",
            "id, user_id, content, liked_by",
            "id, user_id, content",
          ];

          let postsData = null;
          let fallbackError = null;

          for (const selection of selectAttempts) {
            const orderColumn = selection.includes("created_at")
              ? "created_at"
              : "id";
            const { data, error } = await supabase
              .from("posts")
              .select(selection)
              .order(orderColumn, { ascending: false })
              .limit(20);

            if (!error) {
              postsData = data ?? [];
              break;
            }

            if (isSchemaCompatibilityError(error)) {
              fallbackError = error;
              continue;
            }

            throw error;
          }

          if (postsData) {
            setPosts(postsData.map(mapPostFromApi));
            setApiError(null);
          } else if (fallbackError) {
            throw fallbackError;
          }
        } catch (directErr) {
          setApiError(
            directErr.message ||
              "Unable to load posts right now. Please try again in a moment."
          );
        }
      }
    };

    loadPosts();
  }, []);

  const resetComposer = () => {
    if (postImagePreview && postImagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(postImagePreview);
    }
    setPostTitle("");
    setPostEventDate("");
    setPostDescription("");
    setDescriptionTone("professional");
    setPostImageFile(null);
    setPostImagePreview(null);
  };

  const handleRewriteDescriptionTone = async () => {
    if (!postDescription.trim()) {
      setApiError("Add a description first, then choose a tone to rewrite it.");
      return;
    }

    try {
      setIsRewritingDescription(true);
      setApiError(null);
      setSuccessMessage("");

      const rewrittenDescription = await rewritePostDescription(
        postDescription,
        descriptionTone
      );

      setPostDescription(rewrittenDescription);
    } catch (error) {
      setApiError(
        error.message || "Unable to rewrite the description right now."
      );
    } finally {
      setIsRewritingDescription(false);
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    setApiError(null);
    setSuccessMessage("");

    if (!file) {
      if (postImagePreview && postImagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(postImagePreview);
      }
      setPostImageFile(null);
      setPostImagePreview(null);
      return;
    }

    const validation = isValidImageFile(file);
    if (!validation.ok) {
      setApiError(validation.error);
      return;
    }

    if (postImagePreview && postImagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(postImagePreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setPostImageFile(file);
    setPostImagePreview(previewUrl);
  };

  const uploadPostImageToStorage = async (file, userId) => {
    if (!file) return null;
    if (!session?.user?.id) {
      throw new Error("Please sign in before uploading images.");
    }
    if (session.user.id !== userId) {
      throw new Error("Image upload blocked: user does not own this upload path.");
    }

    const extFromName = file.name?.split(".").pop()?.toLowerCase() || "jpg";
    const fallbackExt = file.type.includes("png")
      ? "png"
      : file.type.includes("webp")
        ? "webp"
        : file.type.includes("gif")
          ? "gif"
          : extFromName;
    const uploadId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : newClientUuid();
    const filePath = `${userId}/${uploadId}.${fallbackExt}`;

    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      throw new Error(`Image upload failed: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from("post-images").getPublicUrl(filePath);
    if (!data?.publicUrl) {
      throw new Error("Unable to resolve uploaded image URL.");
    }

    return data.publicUrl;
  };

  const createPostDirectToSupabase = async ({
    userId,
    title,
    description,
    imageUrl,
    eventDate,
    content,
  }) => {
    const isMissingColumnError = (error) => {
      const message = String(error?.message || "").toLowerCase();
      return message.includes("column") && message.includes("does not exist");
    };

    const selectAttempts = [
      "id, user_id, content, title, description, image_url, event_date, created_at, likes, liked_by, comments",
      "id, user_id, content, title, description, image_url, event_date, created_at, likes",
      "id, user_id, content, title, description, image_url, created_at, likes, liked_by, comments",
      "id, user_id, content, title, description, image_url, created_at, likes",
      "id, user_id, content, created_at, likes, liked_by, comments",
      "id, user_id, content, created_at, likes",
      "id, user_id, content, created_at, likes, liked_by",
      "id, user_id, content, created_at",
    ];

    const persistedContent = content || description;
    const payloads = [
      {
        user_id: userId,
        content: persistedContent,
        title,
        description,
        image_url: imageUrl || null,
        event_date: eventDate || null,
        likes: 0,
        liked_by: [],
        comments: [],
      },
      {
        user_id: userId,
        content: persistedContent,
        title,
        description,
        image_url: imageUrl || null,
        event_date: eventDate || null,
        likes: 0,
      },
      {
        user_id: userId,
        content: persistedContent,
        title,
        description,
        image_url: imageUrl || null,
        likes: 0,
      },
      {
        user_id: userId,
        content: persistedContent,
      },
    ];

    let lastError = null;

    for (const payload of payloads) {
      for (const selection of selectAttempts) {
        const { data, error } = await supabase
          .from("posts")
          .insert([payload])
          .select(selection)
          .single();

        if (!error) {
          return data;
        }

        if (isMissingColumnError(error) || isSchemaCompatibilityError(error)) {
          lastError = error;
          continue;
        }

        throw error;
      }
    }

    throw lastError || new Error("Unable to create post in Supabase.");
  };

  const updatePostDirectToSupabase = async (postId, updates) => {
    const isMissingColumnError = (error) => {
      const message = String(error?.message || "").toLowerCase();
      return message.includes("column") && message.includes("does not exist");
    };

    const selectAttempts = [
      "id, user_id, content, title, description, image_url, created_at, likes, liked_by, comments",
      "id, user_id, content, title, description, image_url, created_at, likes, comments",
      "id, user_id, content, created_at, likes, liked_by, comments",
      "id, user_id, content, created_at, likes, comments",
      "id, user_id, content, created_at, likes, liked_by",
      "id, user_id, content, created_at, likes",
      "id, user_id, content, created_at",
    ];

  const readAttempts = [
    "id, likes, liked_by",
    "id, likes",
    "id",
  ];

    const isMissingFunctionError = (error) => {
      const message = String(error?.message || "").toLowerCase();
      return (
        message.includes("function") &&
        (message.includes("does not exist") || message.includes("schema cache"))
      );
    };

    const normalizeRpcPost = (data) => {
      if (Array.isArray(data)) return data[0] ?? null;
      return data ?? null;
    };

    const updateLikeViaRpc = async (userId) => {
      const { data, error } = await supabase.rpc("toggle_post_like", {
        target_post_id: postId,
        actor_user_id: userId,
      });

      if (error) {
        if (isMissingFunctionError(error) || isSchemaCompatibilityError(error)) {
          return null;
        }
        throw error;
      }

      return normalizeRpcPost(data);
    };

    const appendCommentViaRpc = async (comments) => {
      const newComment = comments[comments.length - 1];
      if (!newComment) {
        throw new Error("Comment not found in local state.");
      }

      const { data, error } = await supabase.rpc("append_post_comment", {
        target_post_id: postId,
        new_comment: newComment,
      });

      if (error) {
        if (isMissingFunctionError(error) || isSchemaCompatibilityError(error)) {
          return null;
        }
        throw error;
      }

      return normalizeRpcPost(data);
    };

    const payload = {};

    if (updates.comments !== undefined) {
      if (!Array.isArray(updates.comments)) {
        throw new Error("Comments must be an array.");
      }
      payload.comments = updates.comments;
    }

    if (updates.likes !== undefined) {
      if (typeof updates.likes !== "number" || updates.likes < 0) {
        throw new Error("Likes must be a non-negative number.");
      }
      payload.likes = updates.likes;
    }

    if (updates.liked_by !== undefined) {
      if (!Array.isArray(updates.liked_by)) {
        throw new Error("liked_by must be an array.");
      }
      const normalized = [
        ...new Set(
          updates.liked_by.filter(
            (entry) => typeof entry === "string" && entry.trim()
          )
        ),
      ];
      payload.liked_by = normalized;
      payload.likes = normalized.length;
    }

    if (updates.like_user_id !== undefined) {
      if (
        typeof updates.like_user_id !== "string" ||
        !updates.like_user_id.trim()
      ) {
        throw new Error("like_user_id must be a non-empty string.");
      }

      const rpcPost = await updateLikeViaRpc(updates.like_user_id.trim());
      if (rpcPost) {
        return rpcPost;
      }

      let currentData = null;
      let currentError = null;

      for (const selection of readAttempts) {
        const { data, error } = await supabase
          .from("posts")
          .select(selection)
          .eq("id", postId)
          .single();

        if (!error) {
          currentData = data;
          break;
        }

        if (isMissingColumnError(error) || isSchemaCompatibilityError(error)) {
          currentError = error;
          continue;
        }

        throw error;
      }

      if (!currentData) {
        throw (
          currentError || new Error("Unable to read current like state from Supabase.")
        );
      }

      const currentLikedBy = Array.isArray(currentData.liked_by)
        ? currentData.liked_by.filter(
            (entry) => typeof entry === "string" && entry.trim()
          )
        : [];
      const currentLikes =
        typeof currentData.likes === "number" &&
        Number.isFinite(currentData.likes) &&
        currentData.likes >= 0
          ? currentData.likes
          : currentLikedBy.length;
      const userId = updates.like_user_id.trim();
      const userHasLiked = currentLikedBy.includes(userId);
      const nextLikedBy = userHasLiked
        ? currentLikedBy.filter((entry) => entry !== userId)
        : [...currentLikedBy, userId];
      const nextLikes = userHasLiked
        ? Math.max(currentLikes - 1, 0)
        : currentLikes + 1;

      payload.liked_by = nextLikedBy;
      payload.likes = nextLikes;
    }

    if (Object.keys(payload).length === 0) {
      throw new Error("No valid fields to update.");
    }

    if (
      Object.prototype.hasOwnProperty.call(payload, "comments") &&
      !Object.prototype.hasOwnProperty.call(payload, "liked_by") &&
      !Object.prototype.hasOwnProperty.call(payload, "likes")
    ) {
      const rpcPost = await appendCommentViaRpc(payload.comments);
      if (rpcPost) {
        return rpcPost;
      }
    }

    const variants = [payload];
    if (Object.prototype.hasOwnProperty.call(payload, "comments")) {
      const { comments: _comments, ...withoutComments } = payload;
      if (Object.keys(withoutComments).length > 0) {
        variants.push(withoutComments);
      }
    }
    if (Object.prototype.hasOwnProperty.call(payload, "liked_by")) {
      const { liked_by: _likedBy, ...withoutLikedBy } = payload;
      if (Object.keys(withoutLikedBy).length > 0) {
        variants.push(withoutLikedBy);
      }
    }

    let lastError = null;
    for (const variant of variants) {
      for (const selection of selectAttempts) {
        const { data, error } = await supabase
          .from("posts")
          .update(variant)
          .eq("id", postId)
          .select(selection)
          .single();

        if (!error) {
          return data;
        }

        if (isMissingColumnError(error) || isSchemaCompatibilityError(error)) {
          lastError = error;
          continue;
        }

        throw error;
      }
    }

    throw lastError || new Error("Unable to update post in Supabase.");
  };

  const handleCreatePost = async (event) => {
    event.preventDefault();
    const title = postTitle.trim();
    const eventDate = postEventDate.trim();
    const description = postDescription.trim();
    const validationError = validateComposerInput({ title, description, eventDate });

    if (validationError) {
      setApiError(validationError);
      return;
    }

    if (!session?.user?.id) {
      setApiError("Please sign in to create a post.");
      return;
    }

    setLoadingCreate(true);
    setApiError(null);
    setSuccessMessage("");
    let uploadedImageUrl = null;

    try {
      uploadedImageUrl = await uploadPostImageToStorage(
        postImageFile,
        session.user.id
      );
    } catch (uploadError) {
      setApiError(uploadError.message || "Image upload failed.");
      setLoadingCreate(false);
      return;
    }

    const contentPayload = buildPostContentPayload({
      title,
      description,
      image: uploadedImageUrl,
      eventDate,
    });

    try {
      const response = await createPost({
        content: contentPayload,
        title,
        description,
        image_url: uploadedImageUrl,
        eventDate: eventDate || null,
        user_id: session.user.id,
      });
      const savedPost = response?.post ?? response;

      if (savedPost) {
        const organizationName =
          (typeof profile?.full_name === "string" && profile.full_name.trim()) ||
          (typeof profile?.username === "string" && profile.username.trim()) ||
          (typeof profile?.email === "string" && profile.email.trim()) ||
          "CampusBytes";

        setPosts((prevPosts) => [
          mapPostFromApi({
            ...savedPost,
            title: savedPost.title ?? title,
            description: savedPost.description ?? description,
            image_url: savedPost.image_url ?? uploadedImageUrl,
            event_date: (savedPost.event_date ?? savedPost.eventDate ?? eventDate) || null,
            content: savedPost.content ?? contentPayload,
            organization_name: savedPost.organization_name ?? organizationName,
            created_at: savedPost.created_at ?? new Date().toISOString(),
          }),
          ...prevPosts,
        ]);
        resetComposer();
        setIsComposerOpen(false);
        setSuccessMessage("Post created successfully.");
      }
    } catch (err) {
      try {
        const savedPost = await createPostDirectToSupabase({
          userId: session.user.id,
          title,
          description,
          imageUrl: uploadedImageUrl,
          eventDate,
          content: contentPayload,
        });

        const organizationName =
          (typeof profile?.full_name === "string" && profile.full_name.trim()) ||
          (typeof profile?.username === "string" && profile.username.trim()) ||
          (typeof profile?.email === "string" && profile.email.trim()) ||
          "CampusBytes";

        setPosts((prevPosts) => [
          mapPostFromApi({
            ...savedPost,
            title: savedPost.title ?? title,
            description: savedPost.description ?? description,
            image_url: savedPost.image_url ?? uploadedImageUrl,
            event_date: (savedPost.event_date ?? savedPost.eventDate ?? eventDate) || null,
            content: savedPost.content ?? contentPayload,
            organization_name: savedPost.organization_name ?? organizationName,
            created_at: savedPost.created_at ?? new Date().toISOString(),
          }),
          ...prevPosts,
        ]);
        resetComposer();
        setIsComposerOpen(false);
        setApiError(null);
        setSuccessMessage("Post created successfully.");
      } catch (fallbackError) {
        setApiError(fallbackError.message || err.message);
      }
    } finally {
      setLoadingCreate(false);
    }
  };

  const handleLike = async (id) => {
    if (!session?.user?.id) {
      setApiError("Please sign in to like posts.");
      return;
    }

    const userId = session.user.id;
    const previousPosts = posts;
    const updatedPosts = posts.map((post) => {
      if (post.id !== id) return post;
      const likedBy = Array.isArray(post.liked_by) ? post.liked_by : [];
      const userHasLiked = likedBy.includes(userId);
      const currentLikes =
        typeof post.likes === "number" && Number.isFinite(post.likes) && post.likes >= 0
          ? post.likes
          : likedBy.length;
      const nextLikedBy = userHasLiked
        ? likedBy.filter((entry) => entry !== userId)
        : [...likedBy, userId];
      const nextLikes = userHasLiked
        ? Math.max(currentLikes - 1, 0)
        : currentLikes + 1;

      return {
        ...post,
        liked_by: nextLikedBy,
        likes: nextLikes,
      };
    });

    setPosts(updatedPosts);

    try {
      const saved = await updatePost(id, { like_user_id: userId });
      if (saved && typeof saved === "object") {
        setPosts((current) =>
          current.map((post) =>
            post.id === id
              ? mergePersistedPost(post, saved)
              : post
          )
        );
      }
    } catch (err) {
      if (isNetworkFetchError(err)) {
        try {
          const saved = await updatePostDirectToSupabase(id, {
            like_user_id: userId,
          });
          if (saved && typeof saved === "object") {
            setPosts((current) =>
              current.map((post) =>
                post.id === id
                  ? mergePersistedPost(post, saved)
                  : post
              )
            );
            setApiError(null);
            return;
          }
        } catch (fallbackError) {
          console.error("Failed to persist like toggle via Supabase:", fallbackError);
          setApiError(fallbackError.message || err.message);
          setPosts(previousPosts);
          return;
        }
      }

      console.error("Failed to persist like toggle:", err);
      setApiError(err.message);
      setPosts(previousPosts);
    }
  };

  const handleToggleComments = (id) => {
    setPosts((prevPosts) => toggleComments(prevPosts, id));
  };

  const handleAddComment = async (postId, commentText) => {
    if (!commentText.trim()) return;
    if (!session?.user?.id) {
      setApiError("Please sign in to comment on posts.");
      return;
    }
    const commentAuthorName =
      profile?.full_name?.trim() ||
      profile?.username?.trim() ||
      profile?.email?.trim() ||
      "Anonymous";
    const previousPosts = posts;
    const updatedPosts = addComment(posts, postId, commentText, {
      userId: session.user.id,
      name: commentAuthorName,
    });

    setPosts(updatedPosts);

    try {
      const updatedPost = updatedPosts.find((post) => post.id === postId);
      if (updatedPost) {
        const saved = await updatePost(postId, { comments: updatedPost.comments });
        if (saved && typeof saved === "object") {
          setPosts((current) =>
            current.map((post) =>
              post.id === postId
                ? mergePersistedPost(post, saved)
                : post
            )
          );
        }
      }
    } catch (err) {
      if (isNetworkFetchError(err)) {
        try {
          const updatedPost = updatedPosts.find((post) => post.id === postId);
          if (!updatedPost) {
            throw new Error("Post not found in local state.");
          }
          const saved = await updatePostDirectToSupabase(postId, {
            comments: updatedPost.comments,
          });
          if (saved && typeof saved === "object") {
            setPosts((current) =>
              current.map((post) =>
                post.id === postId
                  ? mergePersistedPost(post, saved)
                  : post
              )
            );
            setApiError(null);
            return;
          }
        } catch (fallbackError) {
          console.error("Failed to persist comment via Supabase:", fallbackError);
          setApiError(fallbackError.message || err.message);
          setPosts(previousPosts);
          return;
        }
      }

      console.error("Failed to persist comment:", err);
      setApiError(err.message);
      setPosts(previousPosts);
    }
  };

  const openComposer = () => {
    setApiError(null);
    setSuccessMessage("");
    setIsComposerOpen(true);
  };

  const closeComposer = () => {
    setIsComposerOpen(false);
    setApiError(null);
    resetComposer();
  };

  const handleOpenOrganization = async (profileId) => {
    try {
      const organization = await fetchOrganizationByProfileId(profileId);
      navigate(`/organizations/${organization.id}`);
    } catch (error) {
      setApiError(error.message || "Unable to open that organization profile.");
    }
  };

  const handleMenuNavigate = (path) => {
    setIsProfileMenuOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    setIsProfileMenuOpen(false);
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const titleLength = postTitle.length;
  const descriptionLength = postDescription.length;
  const todayDate = getTodayDateString();
  const isComposerSubmitDisabled =
    loadingCreate ||
    !postTitle.trim() ||
    !postDescription.trim() ||
    titleLength > TITLE_MAX_LENGTH ||
    descriptionLength > DESCRIPTION_MAX_LENGTH;

  return (
    <div className="h-screen bg-gradient-to-br from-sky-200 via-blue-100 to-slate-200 flex justify-center overflow-hidden">
      <div className="max-w-[1400px] w-full h-screen bg-gradient-to-b from-slate-50 to-slate-100 shadow-[0_10px_40px_rgba(15,23,42,0.15)] border border-white/70 flex flex-col">
        <div className="relative z-20 flex min-h-16 flex-wrap items-center gap-4 border-b border-slate-200 bg-white/60 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex flex-shrink-0 items-center gap-3">
            <img
              src="/logo.png"
              alt="logo"
              className="h-15 w-15 object-contain"
            />
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-slate-800 leading-tight">
                CampusBytes
              </h1>
              <p className="text-xs text-slate-600">Campus posts and org updates</p>
            </div>
          </div>

          {/* Center: Organization search bar */}
          <div className="order-3 w-full md:order-none md:flex-1">
            <div className="mx-auto w-full max-w-md">
              <OrgSearchBar />
            </div>
          </div>

         
          {/* Right: Profile Dropdown */}
          <div
            className="relative ml-auto flex flex-shrink-0 items-center gap-3"
            ref={profileMenuRef}
          >
            {profile && (
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((current) => !current)}
                aria-expanded={isProfileMenuOpen}
                aria-haspopup="menu"
                className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/90 px-3 py-2 shadow-sm transition hover:bg-slate-50"
              >
                <AvatarBadge
                  src={profile.avatar_url}
                  label={profile.username || profile.email || "Profile"}
                  size="sm"
                />
                <div className="hidden sm:block text-sm text-left">
                  <div className="font-semibold text-slate-800">
                    {profile.username || profile.email}
                  </div>
                  <div className="text-slate-500 text-xs">{profile.role}</div>
                </div>
              </button>
            )}

            {isProfileMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                <button
                  onClick={() => handleMenuNavigate("/profile")}
                  className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-100"
                >
                  Profile
                </button>
                <button
                  onClick={() => handleMenuNavigate("/settings")}
                  className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-100"
                >
                  Settings
                </button>
                <button
                  onClick={() => handleMenuNavigate("/edit-profile")}
                  className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-100"
                >
                  Edit Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full rounded-xl px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* â”€â”€ Main content grid â”€â”€ */}
        <div className="grid grid-cols-12 gap-4 p-6 flex-1 overflow-hidden min-h-0">
          <aside className="col-span-12 lg:col-span-2">
            <div className="rounded-md bg-white/70 border border-slate-200 p-4 h-full overflow-hidden">
              <h2 className="text-sm font-semibold mb-4 text-slate-700">
                Menu
              </h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate("/")}
                  className="w-full rounded bg-slate-100 p-2 text-left hover:bg-slate-200"
                >
                  Home
                </button>
                <button
                  onClick={() => navigate("/organizations")}
                  className="w-full rounded bg-slate-100 p-2 text-left hover:bg-slate-200"
                >
                  Organizations
                </button>
                <button
                  onClick={() => navigate("/events")}
                  className="w-full rounded bg-slate-100 p-2 text-left hover:bg-slate-200"
                >
                  Events
                </button>
                <button
                  onClick={() => navigate("/calendar")}
                  className="w-full rounded bg-slate-100 p-2 text-left hover:bg-slate-200"
                >
                  Calendar
                </button>
              </div>
            </div>
          </aside>

          {/* Main feed */}
          <main className="col-span-12 lg:col-span-8 flex flex-col min-h-0">
            <div className="rounded-md bg-white/70 border border-slate-200 flex flex-col h-full overflow-hidden min-h-0">
              {successMessage && (
                <div className="mx-4 mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {successMessage}
                </div>
              )}
              {apiError && (
                <div className="mx-4 mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {apiError}
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {posts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white/80 p-8 text-center text-slate-600">
                    No posts yet. Organization updates will appear here.
                  </div>
                ) : (
                  posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onLike={handleLike}
                      onToggleComments={handleToggleComments}
                      onAddComment={handleAddComment}
                      onOpenProfile={
                        post.role === "Organization"
                          ? handleOpenOrganization
                          : undefined
                      }
                    />
                  ))
                )}
              </div>
            </div>
          </main>

          {/* Right sidebar */}
          <aside className="col-span-12 lg:col-span-2 flex flex-col gap-4">
            {profile?.role === "Organization" && (
              <div className="rounded-md bg-white/70 border border-slate-200 p-4 overflow-hidden">
                {isProfileLoading ? (
                  <div className="rounded-md bg-slate-50 p-4 text-sm text-slate-600">
                    Loading profile...
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={openComposer}
                    className="group relative w-full overflow-hidden rounded-xl border border-sky-300 bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-300/40 transition hover:-translate-y-0.5"
                  >
                    <span className="absolute inset-0 bg-white/15 opacity-0 transition group-hover:opacity-100" />
                    <span className="relative">Create Post</span>
                  </button>
                )}
                {apiError && !isComposerOpen && (
                  <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                    {apiError}
                  </div>
                )}
              </div>
            )}

            <div className="rounded-md bg-white/70 border border-slate-200 p-4 overflow-hidden">
              <h2 className="text-sm font-semibold mb-4 text-slate-700">
                Upcoming
              </h2>
              <div className="space-y-3">
                <div className="p-2 rounded bg-slate-100">Hackathon</div>
                <div className="p-2 rounded bg-slate-100">Dance Night</div>
                <div className="p-2 rounded bg-slate-100">Tech Talk</div>
                <div className="p-2 rounded bg-slate-100">Photo Walk</div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {isComposerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-3 py-6 backdrop-blur-sm sm:px-6"
        >
          <div
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/40 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-5 shadow-2xl sm:p-6"
          >
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-300/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-sky-400/20 blur-3xl" />

            <div className="relative flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Compose Campus Post</h3>
                <p className="text-sm text-slate-600">
                  Share polished updates with students in one tap.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreatePost} className="relative mt-5 space-y-4">
              <div className="space-y-1">
                <label htmlFor="post-title" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Title
                </label>
                <input
                  id="post-title"
                  type="text"
                  value={postTitle}
                  maxLength={TITLE_MAX_LENGTH}
                  onChange={(event) => {
                    setPostTitle(event.target.value);
                    setApiError(null);
                    setSuccessMessage("");
                  }}
                  placeholder="Enter an announcement title"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                />
                <p className="text-xs text-slate-500">
                  {titleLength}/{TITLE_MAX_LENGTH}
                </p>
              </div>

              <div className="space-y-1">
                <label htmlFor="post-event-date" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Event Date
                </label>
                <input
                  id="post-event-date"
                  type="date"
                  value={postEventDate}
                  min={todayDate}
                  onChange={(event) => {
                    setPostEventDate(event.target.value);
                    setApiError(null);
                    setSuccessMessage("");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="post-image" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Image Upload
                </label>
                <input
                  id="post-image"
                  type="file"
                  accept={ACCEPTED_IMAGE_MIME_TYPES.join(",")}
                  onChange={handleImageChange}
                  className="w-full rounded-xl border border-dashed border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-sky-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-sky-900 hover:border-sky-300"
                />
                <p className="text-xs text-slate-500">
                  Accepted: JPG, PNG, WEBP, GIF. Max size: {Math.floor(MAX_IMAGE_SIZE_BYTES / (1024 * 1024))}MB.
                </p>
                {postImagePreview && (
                  <img
                    src={postImagePreview}
                    alt="Post preview"
                    className="mt-3 h-44 w-full rounded-xl border border-slate-200 object-cover"
                  />
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="post-description" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Description
                </label>
                <div className="flex flex-col gap-2 rounded-xl border border-sky-100 bg-white/80 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Rewrite tone</p>
                    <p className="text-xs text-slate-500">
                      Rework the description into a more polished voice before posting.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <select
                      aria-label="Description tone"
                      value={descriptionTone}
                      onChange={(event) => setDescriptionTone(event.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                    >
                      {DESCRIPTION_TONE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleRewriteDescriptionTone}
                      disabled={!postDescription.trim() || isRewritingDescription}
                      className="rounded-xl border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-900 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isRewritingDescription ? "Rewriting..." : "Rewrite Tone"}
                    </button>
                  </div>
                </div>
                <textarea
                  id="post-description"
                  value={postDescription}
                  maxLength={DESCRIPTION_MAX_LENGTH}
                  onChange={(event) => {
                    setPostDescription(event.target.value);
                    setApiError(null);
                    setSuccessMessage("");
                  }}
                  placeholder="Write the full post details for students..."
                  className="min-h-[150px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                />
                <p className="text-xs text-slate-500">
                  {descriptionLength}/{DESCRIPTION_MAX_LENGTH}
                </p>
              </div>

              {apiError && (
                <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {apiError}
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeComposer}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isComposerSubmitDisabled}
                  className="rounded-xl bg-gradient-to-r from-sky-900 via-cyan-600 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-300/50 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingCreate ? "Posting..." : "Send Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
