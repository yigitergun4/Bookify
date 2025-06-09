export interface UserGoal {
  id: string;
  title: string;
  searchStrategy: string | ((genres: string[]) => string);
  categories: string[] | ((genres: string[]) => string[]);
  description: string;
}
