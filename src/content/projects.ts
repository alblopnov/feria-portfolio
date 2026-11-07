export type Project = {
  id: string;
  title: string;
  summary: string;
  tech: string[];
  links: { label: string; url: string }[];
  locked: boolean;
  teaser: string;
  interior: string | null;
};

const GITHUB = 'https://github.com/alblopnov';

export const projects: Record<string, Project> = {
  caseta: {
    id: 'caseta',
    title: 'Caseta-musica',
    summary:
      'A shared jukebox for a party or a small venue. One Raspberry Pi plays through the speakers and everyone picks songs from their own phone browser, first come, first served. Works fully offline.',
    tech: ['Python', 'Flask', 'pygame', 'Raspberry Pi'],
    links: [{ label: 'GitHub profile', url: GITHUB }],
    locked: false,
    teaser: '',
    interior: 'caseta',
  },
  about: {
    id: 'about',
    title: 'About me',
    summary:
      'Hi, I am Alberto. I build things to learn: a jukebox for the feria, machine-learning experiments and small services. This town is my portfolio; each caseta is a project.',
    tech: ['TypeScript', 'Python', 'Java'],
    links: [{ label: 'GitHub profile', url: GITHUB }],
    locked: false,
    teaser: '',
    interior: 'about',
  },
  contact: {
    id: 'contact',
    title: 'Contact',
    summary: 'Find me on GitHub and say hello.',
    tech: [],
    links: [{ label: 'GitHub profile', url: GITHUB }],
    locked: false,
    teaser: '',
    interior: null,
  },
  'ml-classifier': {
    id: 'ml-classifier',
    title: 'ML Classifier',
    summary: '',
    tech: [],
    links: [],
    locked: true,
    teaser: 'Under construction: a model that listens to songs and tags their mood and genre.',
    interior: null,
  },
  'java-service': {
    id: 'java-service',
    title: 'Java Service',
    summary: '',
    tech: [],
    links: [],
    locked: true,
    teaser: 'Under construction: a Spring Boot API that serves the music library and its tags.',
    interior: null,
  },
  dashboard: {
    id: 'dashboard',
    title: 'Dashboard',
    summary: '',
    tech: [],
    links: [],
    locked: true,
    teaser: 'Under construction: a live control room for everything running in Docker.',
    interior: null,
  },
};

export function getProject(id: string): Project | undefined {
  return Object.hasOwn(projects, id) ? projects[id] : undefined;
}

export function findMissingIds(ids: string[], source: Record<string, Project> = projects): string[] {
  return ids.filter((id) => !Object.hasOwn(source, id));
}
