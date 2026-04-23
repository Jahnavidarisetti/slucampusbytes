const express = require('express');
const { supabase } = require('../supabaseClient');

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

const SORT_COLUMN_BY_KEY = {
  featured: 'featured_score',
  liked: 'likes_count',
  popular: 'member_count'
};

function parseNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parsePagination(query = {}) {
  let limit = parseInt(query.limit, 10);
  if (!Number.isFinite(limit) || limit < 1) {
    limit = DEFAULT_LIMIT;
  }
  limit = Math.min(limit, MAX_LIMIT);

  let offset = parseInt(query.offset, 10);
  if (!Number.isFinite(offset) || offset < 0) {
    offset = 0;
  }

  return { limit, offset };
}

function normalizeSort(sortBy) {
  const normalized = String(sortBy || '').toLowerCase();
  if (normalized === 'liked') return 'liked';
  if (normalized === 'popular') return 'popular';
  return 'featured';
}

function escapeLikeTerm(value) {
  return String(value).replace(/[,%_]/g, ' ').trim();
}

function normalizeOrganization(row) {
  return {
    id: row.id,
    name: row.name || 'Unnamed Organization',
    description: row.description || 'No description provided yet.',
    category: row.category || 'General',
    likesCount: parseNumber(row.likes_count, 0),
    memberCount: parseNumber(row.member_count, 0),
    featuredScore: parseNumber(row.featured_score, 0),
    isFeatured: Boolean(row.is_featured)
  };
}

function createOrganizationsRouter() {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const { q = '', sortBy: requestedSortBy } = req.query || {};
    const sortBy = normalizeSort(requestedSortBy);
    const { limit, offset } = parsePagination(req.query);
    const sortColumn = SORT_COLUMN_BY_KEY[sortBy];

    try {
      let query = supabase
        .from('organizations')
        .select(
          'id, name, description, category, likes_count, member_count, featured_score, is_featured'
        );

      const searchText = escapeLikeTerm(q);
      if (searchText) {
        query = query.or(
          `name.ilike.%${searchText}%,category.ilike.%${searchText}%`
        );
      }

      // Fetch one extra row to determine hasMore without a second query.
      const { data, error } = await query
        .order(sortColumn, { ascending: false, nullsFirst: false })
        .order('id', { ascending: false })
        .range(offset, offset + limit);

      if (error) {
        return res.status(500).json({ message: error.message });
      }

      const rows = Array.isArray(data) ? data : [];
      const hasMore = rows.length > limit;
      const pagedRows = (hasMore ? rows.slice(0, limit) : rows).map((row) =>
        normalizeOrganization(row)
      );

      res.setHeader('X-Org-Limit', String(limit));
      res.setHeader('X-Org-Offset', String(offset));
      res.setHeader('X-Org-Count', String(pagedRows.length));
      res.setHeader('X-Org-Has-More', hasMore ? 'true' : 'false');

      return res.status(200).json(pagedRows);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });

  router.post('/:organizationId/join', async (req, res) => {
    const { organizationId } = req.params;
    const { user_id: userId } = req.body || {};

    if (!organizationId) {
      return res.status(400).json({ message: 'organizationId is required.' });
    }

    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      return res.status(401).json({
        message: 'Authentication required. Provide a valid "user_id".'
      });
    }

    try {
      const membershipPayload = {
        organization_id: organizationId,
        user_id: userId.trim()
      };

      const { error } = await supabase
        .from('organization_memberships')
        .upsert(membershipPayload, { onConflict: 'organization_id,user_id' });

      if (error) {
        return res.status(500).json({ message: error.message });
      }

      return res.status(200).json({
        message: 'Joined organization successfully.',
        organizationId
      });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });

  return router;
}

module.exports = createOrganizationsRouter;
