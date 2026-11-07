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
    links: [{ label: 'Caseta-musica on GitHub', url: `${GITHUB}/Caseta-musica` }],
    locked: false,
    teaser: '',
    interior: 'caseta',
  },
  about: {
    id: 'about',
    title: 'About me',
    summary:
      'Hi, I am Alberto López-Benjumea, a Software Engineer II in Dublin, Ireland. I build full-stack tools with .NET, React and Python, from compliance dashboards to API integrations. I studied Software Engineering at the University of Seville, and this feria is my portfolio: each caseta is a project.',
    tech: ['Python', 'TypeScript', 'JavaScript', 'C# (.NET)', 'Java', 'SQL', 'React', 'FastAPI', 'Django', 'Flask', 'PyTorch', 'OpenAI API', 'AWS', 'Docker', 'Kubernetes', 'CI/CD'],
    links: [{ label: 'GitHub profile', url: GITHUB }],
    locked: false,
    teaser: '',
    interior: 'about',
  },
  contact: {
    id: 'contact',
    title: 'Contact',
    summary: 'Say hello! I am based in Dublin, Ireland, and the best way to reach me is by email: a.lopezbenjumea@gmail.com.',
    tech: [],
    links: [
      { label: 'Email me', url: 'mailto:a.lopezbenjumea@gmail.com' },
      { label: 'LinkedIn', url: 'https://www.linkedin.com/in/alopezbenjumea/' },
      { label: 'GitHub profile', url: GITHUB },
    ],
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
