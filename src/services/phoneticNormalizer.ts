/**
 * Universal Technical Phonetic Normalizer
 * Automatically corrects common speech-to-text acoustic mishearings for software engineering terms.
 */

const PHONETIC_CORRECTIONS: Array<[RegExp, string]> = [
  // Programming & Frameworks
  [/\b(type script|type-script)\b/gi, 'TypeScript'],
  [/\b(java script|java-script)\b/gi, 'JavaScript'],
  [/\b(next js|nextjs|next-js)\b/gi, 'Next.js'],
  [/\b(react js|reactjs|react-js)\b/gi, 'React'],
  [/\b(node js|nodejs|node-js)\b/gi, 'Node.js'],
  [/\b(vue js|vuejs|vue-js)\b/gi, 'Vue.js'],
  [/\b(express js|expressjs|express-js)\b/gi, 'Express.js'],
  [/\b(post gres|postgres sql|postgre sql|postgress)\b/gi, 'PostgreSQL'],
  [/\b(my sequel|my sql|my-sql)\b/gi, 'MySQL'],
  [/\b(mongo db|mongodb|mongo-db)\b/gi, 'MongoDB'],
  [/\b(c plus plus|c \+\+)\b/gi, 'C++'],
  [/\b(c sharp|c \#)\b/gi, 'C#'],
  [/\b(go lang|golang)\b/gi, 'Go'],
  [/\b(spring boot|springboot)\b/gi, 'Spring Boot'],
  [/\b(fast api|fastapi)\b/gi, 'FastAPI'],
  [/\b(py torch|pytorch)\b/gi, 'PyTorch'],
  [/\b(kuber netes|k 8 s|k8s)\b/gi, 'Kubernetes'],
  [/\b(terra form|terraform)\b/gi, 'Terraform'],
  [/\b(graph ql|graphql|graph-ql)\b/gi, 'GraphQL'],
  [/\b(g r p c|grpc)\b/gi, 'gRPC'],
  [/\b(proto buf|protobuf)\b/gi, 'Protobuf'],
  [/\b(swift ui|swiftui)\b/gi, 'SwiftUI'],
  [/\b(jet pack compose|jetpackcompose)\b/gi, 'Jetpack Compose'],
  [/\b(core routine|co-routine|coroutine)\b/gi, 'coroutine'],
  [/\b(state flow|stateflow)\b/gi, 'StateFlow'],
  [/\b(shared flow|sharedflow)\b/gi, 'SharedFlow'],
  [/\b(tail wind|tailwind css)\b/gi, 'Tailwind CSS'],
  [/\b(prisma orm|prisma)\b/gi, 'Prisma'],
  [/\b(redux tool kit|redux toolkit|rtk)\b/gi, 'Redux Toolkit'],

  // Architecture & DSA Concepts
  [/\b(micro services|micro-services)\b/gi, 'microservices'],
  [/\b(event driven|event-driven)\b/gi, 'event-driven'],
  [/\b(two pointer|2 pointer)\b/gi, 'two-pointer'],
  [/\b(sliding window)\b/gi, 'sliding window'],
  [/\b(dynamic programming|d p)\b/gi, 'dynamic programming'],
  [/\b(binary search tree|b s t)\b/gi, 'BST'],
  [/\b(depth first search|d f s)\b/gi, 'DFS'],
  [/\b(breadth first search|b f s)\b/gi, 'BFS'],
  [/\b(l r u cache|lru cache)\b/gi, 'LRU cache'],
  [/\b(time complexity|big o)\b/gi, 'time complexity'],
  [/\b(clean architecture)\b/gi, 'Clean Architecture'],
  [/\b(m v v m|mvvm)\b/gi, 'MVVM'],
  [/\b(rest api|restful api)\b/gi, 'REST API'],
  [/\b(c i c d|ci cd|ci\/cd)\b/gi, 'CI/CD'],
];

export function normalizeTechnicalTranscript(rawText: string, customKeywords: string[] = []): string {
  if (!rawText || rawText.trim().length === 0) return rawText;

  let normalized = rawText;

  // Apply default CS phonetic regexes
  for (const [pattern, replacement] of PHONETIC_CORRECTIONS) {
    normalized = normalized.replace(pattern, replacement);
  }

  // Apply custom persona keywords case matching
  for (const kw of customKeywords) {
    if (!kw || kw.trim().length < 2) continue;
    try {
      const regex = new RegExp(`\\b${kw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'gi');
      normalized = normalized.replace(regex, kw);
    } catch {}
  }

  return normalized;
}
