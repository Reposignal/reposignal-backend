import { db } from "../db/client";
import { domains, frameworks, languages } from "../db/schema/index";
import { normalizeMatchingName } from "../utils/normalization";

type Entry = { matchingName: string; displayName: string };

// Canonical source-of-truth constants (exactly as provided)
export const LANGUAGES = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'PHP', 'Ruby',
  'C', 'C++', 'C#', 'Zig', 'Nim',
  'Swift', 'Kotlin', 'Objective-C', 'Dart',
  'Scala', 'Haskell', 'Elixir', 'Erlang', 'OCaml',
  'R', 'Julia', 'MATLAB',
  'Shell', 'PowerShell', 'Lua',
  'Solidity', 'Move',
  'Groovy',
  'Other',
] as const;

export const FRAMEWORK_GROUPS: Record<string, readonly string[]> = {
  frontend: [
    'React', 'Next.js', 'Vue', 'Nuxt', 'Angular', 'Svelte', 'SvelteKit',
    'SolidJS', 'Remix', 'Astro', 'Qwik', 'Ember', 'Backbone', 'Lit', 'Other',
  ],
  backend: [
    'Node.js', 'Express', 'Fastify', 'NestJS', 'Hapi',
    'Django', 'Flask', 'FastAPI', 'Pyramid',
    'Spring', 'Quarkus', 'Micronaut',
    'Rails', 'Laravel', 'Symfony',
    'Gin', 'Echo', 'Fiber', 'Chi',
    'ASP.NET',
    'Phoenix',
    'Actix', 'Axum', 'Rocket',
    'Other',
  ],
  mobile: [
    'Android', 'iOS', 'Flutter', 'React Native', 'Expo',
    'SwiftUI', 'Jetpack Compose', 'Kotlin Multiplatform', 'Unity', 'Other',
  ],
  data_ml: [
    'TensorFlow', 'PyTorch', 'Keras', 'Scikit-learn', 'Pandas', 'NumPy',
    'Spark', 'Ray', 'HuggingFace', 'JAX',
    'XGBoost', 'LightGBM', 'MLflow', 'Airflow', 'dbt', 'Other',
  ],
  tooling: [
    'Cobra', 'Click', 'Argparse', 'Commander', 'oclif', 'Typer', 'Gluegun', 'Other',
  ],
  container: [
    'Docker', 'Docker Compose', 'Kubernetes', 'Helm', 'Nomad', 'Podman', 'Other',
  ],
  infra: [
    'Terraform', 'Pulumi', 'AWS CDK', 'CloudFormation',
    'Bicep', 'Ansible', 'Chef', 'Puppet', 'Crossplane', 'Other',
  ],
  cloud: [
    'AWS', 'GCP', 'Azure', 'DigitalOcean', 'Linode',
    'Hetzner', 'Oracle Cloud', 'IBM Cloud', 'Cloudflare', 'Other',
  ],
  ci_cd: [
    'GitHub Actions', 'GitLab CI', 'CircleCI', 'Jenkins',
    'ArgoCD', 'Tekton', 'Buildkite', 'Travis CI', 'Other',
  ],
};

export const DOMAINS = [
  'Web', 'Frontend', 'Backend', 'Mobile', 'Infrastructure', 'Devops',
  'Platform', 'Data', 'ML', 'AI', 'Security', 'Fintech', 'Health',
  'Education', 'Gaming', 'Blockchain', 'Research', 'Developer-Tools',
  'CLI-tools', 'Automation', 'Open-Data', 'Internal-Tools', 'Other',
] as const;

const toEntries = (names: readonly string[]): Entry[] =>
  names.map((displayName) => ({ matchingName: normalizeMatchingName(displayName), displayName }));

export async function seedCanonicalConstants() {
  const languageEntries = toEntries(LANGUAGES);
  for (const e of languageEntries) {
    await db
      .insert(languages)
      .values({ matchingName: e.matchingName, displayName: e.displayName })
      .onConflictDoNothing({ target: languages.matchingName });
  }

  for (const [category, names] of Object.entries(FRAMEWORK_GROUPS)) {
    const entries = toEntries(names);
    for (const e of entries) {
      await db
        .insert(frameworks)
        .values({ matchingName: e.matchingName, displayName: e.displayName, category })
        .onConflictDoNothing({ target: frameworks.matchingName });
    }
  }

  const domainEntries = toEntries(DOMAINS);
  for (const e of domainEntries) {
    await db
      .insert(domains)
      .values({ matchingName: e.matchingName, displayName: e.displayName })
      .onConflictDoNothing({ target: domains.matchingName });
  }

  return {
    languagesInserted: languageEntries.length,
    frameworksGroupsProcessed: Object.keys(FRAMEWORK_GROUPS).length,
    domainsInserted: domainEntries.length,
  };
}

if (require.main === module) {
  seedCanonicalConstants()
    .then((res) => {
      console.log("Canonical seed complete:", res);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Canonical seed failed:", err);
      process.exit(1);
    });
}
