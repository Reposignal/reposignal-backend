import { db } from '../../db/client';
import { users } from '../../db/schema/index';
import { writeLog } from '../logs/writer';
import { ActorType } from '../../utils/enums';
import { eq } from 'drizzle-orm';

export type ProfileUpdate = {
  githubUserId: number;
  username: string;
  avatarUrl?: string;
  bio?: string | null;
  links?: Record<string, any> | null;
};

export async function updateProfile(data: ProfileUpdate) {
  const { githubUserId, username, avatarUrl, bio, links } = data;

  // Upsert user profile
  const [user] = await db
    .insert(users)
    .values({
      githubUserId,
      username,
      avatarUrl: avatarUrl ?? null,
      bio: bio ?? null,
      links: links ?? null,
    })
    .onConflictDoUpdate({
      target: users.githubUserId,
      set: {
        username,
        avatarUrl: avatarUrl ?? null,
        bio: bio ?? null,
        links: links ?? null,
      },
    })
    .returning();

    await writeLog({
      actor: { type: 'user', githubId: githubUserId, username },
      action: 'profile_updated',
      entityType: 'user_profile',
      entityId: `user:${githubUserId}`,
      context: {
        fields_updated: [
          ...(bio !== undefined ? ['bio'] : []),
          ...(links !== undefined ? ['links'] : []),
        ],
      },
    });

  return user;
}
