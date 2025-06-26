import { GoogleBooksItem } from "@/types/booksapitypes";

/**
 * Remove duplicate books from an array based on book ID
 * @param books Array of GoogleBooksItem
 * @returns Array of unique books
 */
export const removeDuplicateBooks = (
  books: GoogleBooksItem[]
): GoogleBooksItem[] => {
  return books.filter(
    (book: GoogleBooksItem, index: number, array: GoogleBooksItem[]) =>
      array.findIndex((b: GoogleBooksItem) => b.id === book.id) === index
  );
};

/**
 * Shuffle an array of books randomly
 * @param books Array of GoogleBooksItem
 * @returns Shuffled array of books
 */
export const shuffleBooks = (books: GoogleBooksItem[]): GoogleBooksItem[] => {
  return [...books].sort(() => Math.random() - 0.5);
};

/**
 * Filter out books that exist in multiple sets (library, existing recommendations, etc.)
 * @param books Books to filter
 * @param existingBookIds Set of book IDs to exclude
 * @param libraryBookIds Set of library book IDs to exclude
 * @param previouslyRecommendedIds Set of previously recommended book IDs to exclude
 * @returns Filtered unique books
 */
export const filterUniqueBooks = (
  books: GoogleBooksItem[],
  existingBookIds: Set<string>,
  libraryBookIds: Set<string>,
  previouslyRecommendedIds: Set<string>
): GoogleBooksItem[] => {
  return books.filter(
    (book: GoogleBooksItem) =>
      !existingBookIds.has(book.id) &&
      !libraryBookIds.has(book.id) &&
      !previouslyRecommendedIds.has(book.id)
  );
};
