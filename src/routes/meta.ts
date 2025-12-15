import { Hono } from 'hono';
import { listLanguages, listFrameworksGrouped, listDomains } from '../modules/meta/list';

const meta = new Hono();

meta.get('/languages', async (c) => {
  const data = await listLanguages();
  return c.json(data);
});

meta.get('/frameworks', async (c) => {
  const data = await listFrameworksGrouped();
  return c.json(data);
});

meta.get('/domains', async (c) => {
  const data = await listDomains();
  return c.json(data);
});

export default meta;
