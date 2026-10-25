import { apiClient, mockDelay, USE_MOCK_API } from "@/lib/api/client";
import { ANON_NAMES, mockCommunityPosts } from "@/data/mock";
import type { CommunityPost } from "@/types";

let posts: CommunityPost[] = mockCommunityPosts.map((p) => ({ ...p }));

export const communityService = {
  async list(): Promise<CommunityPost[]> {
    if (!USE_MOCK_API) return apiClient.get<CommunityPost[]>("/community/posts");
    return mockDelay(posts.map((p) => ({ ...p })));
  },
  async create(body: string): Promise<CommunityPost> {
    if (!USE_MOCK_API) return apiClient.post<CommunityPost>("/community/posts", { body });
    const post: CommunityPost = {
      id: crypto.randomUUID(),
      author: ANON_NAMES[Math.floor(Math.random() * ANON_NAMES.length)]!,
      body,
      postedAgo: "Just now",
      reactions: 0,
      reacted: false,
      isOwn: true,
    };
    posts = [post, ...posts];
    return mockDelay({ ...post });
  },
  async toggleSolidarity(id: string): Promise<CommunityPost> {
    if (!USE_MOCK_API) return apiClient.post<CommunityPost>(`/community/posts/${id}/solidarity`, {});
    posts = posts.map((p) => (p.id === id ? { ...p, reacted: !p.reacted, reactions: p.reactions + (p.reacted ? -1 : 1) } : p));
    return mockDelay({ ...posts.find((p) => p.id === id)! }, 100);
  },
};
