// Maps topical queries to relevant department codes
// This is a simple v1 implementation - can be expanded with more sophisticated matching later

export const topicMapping = {
  // Technology & Computing
  "machine learning": ["CSCI", "APMA", "ENGN"],
  "artificial intelligence": ["CSCI", "CLPS", "ENGN"],
  "ai": ["CSCI", "CLPS", "ENGN"],
  "programming": ["CSCI", "ENGN"],
  "computer science": ["CSCI"],
  "data science": ["CSCI", "APMA", "ECON"],
  "robotics": ["CSCI", "ENGN"],

  // Politics & Philosophy
  "political theory": ["POLS", "PHIL"],
  "political philosophy": ["POLS", "PHIL"],
  "politics": ["POLS", "HIST", "SOC"],
  "philosophy": ["PHIL", "COLT", "RELS"],
  "ethics": ["PHIL", "POLS"],
  "democracy": ["POLS", "HIST"],
  "international relations": ["POLS", "HIST"],

  // Economics & Business
  "economics": ["ECON", "POLS"],
  "finance": ["ECON", "APMA"],
  "statistics": ["APMA", "ECON", "CSCI"],
  "data analysis": ["APMA", "ECON", "CSCI"],

  // Science & Health
  "neuroscience": ["NEUR", "CLPS", "BIOL"],
  "brain": ["NEUR", "CLPS"],
  "psychology": ["CLPS", "NEUR", "SOC"],
  "biology": ["BIOL", "NEUR"],
  "evolution": ["BIOL", "ANTH"],
  "climate": ["ENVS", "GEOL", "BIOL"],
  "environment": ["ENVS", "BIOL", "GEOL"],
  "medicine": ["BIOL", "NEUR", "ENGN"],
  "health": ["BIOL", "SOC", "ANTH"],

  // Humanities & Arts
  "history": ["HIST", "COLT", "ANTH"],
  "literature": ["COLT", "ENGL"],
  "art": ["VISA", "HIAA"],
  "music": ["MUSC"],
  "theater": ["TAPS"],
  "film": ["MCM", "VISA"],
  "media": ["MCM", "SOC"],
  "writing": ["ENGL", "COLT"],

  // Social Sciences
  "sociology": ["SOC", "ANTH"],
  "anthropology": ["ANTH", "SOC"],
  "urban": ["SOC", "ENVS", "POLS"],
  "inequality": ["SOC", "ECON", "POLS"],
  "race": ["AFRI", "SOC", "HIST"],
  "gender": ["GNSS", "SOC", "HIST"],

  // Engineering
  "engineering": ["ENGN", "CSCI"],
  "design": ["VISA", "ENGN"],
  "biomedical": ["ENGN", "BIOL"],
};

// Get all unique departments from the mapping
export const allDepartments = [...new Set(Object.values(topicMapping).flat())].sort();

// Search function that returns matching departments
export function getDepartmentsForQuery(query) {
  const lowerQuery = query.toLowerCase().trim();

  // Check if it's a direct department code (e.g., "CSCI", "ECON")
  if (lowerQuery.length <= 5 && lowerQuery === lowerQuery.toUpperCase()) {
    return [query.toUpperCase()];
  }

  // Check for exact topic match
  if (topicMapping[lowerQuery]) {
    return topicMapping[lowerQuery];
  }

  // Check for partial topic match
  const matchingTopics = Object.keys(topicMapping).filter(topic =>
    topic.includes(lowerQuery) || lowerQuery.includes(topic)
  );

  if (matchingTopics.length > 0) {
    const departments = new Set();
    matchingTopics.forEach(topic => {
      topicMapping[topic].forEach(dept => departments.add(dept));
    });
    return [...departments];
  }

  // No match found - return empty (will search all courses by keyword)
  return [];
}
