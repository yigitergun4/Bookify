export interface UserGoal {
  id: string;
  title: string;
  searchStrategy: string | ((genres: string[]) => string);
  categories: string[] | ((genres: string[]) => string[]);
  description: string;
}

export interface UserPreferences {
  name: string;
  email: string;
  favoriteGenres: string[];
  favoriteAuthors: string[];
  favoriteBooks: any[]; // GoogleBooksItem[]
  unforgettableBook: string;
  userGoal: UserGoal | null;
  library: any[]; // GoogleBooksItem[]
  createdAt: string;
  country: string;
  firstLaunchCompleted: boolean;
}
