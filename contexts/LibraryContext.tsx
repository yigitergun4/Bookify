import React, { createContext, useContext, useState } from "react";

const LibraryContext = createContext<any>(null);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [libraryBooks, setLibraryBooks] = useState<any[]>([]);

  const addBook = (book: any) => {
    setLibraryBooks((prev) => [book, ...prev]);
  };

  const removeBook = (bookId: string) => {
    setLibraryBooks((prev) => prev.filter((b) => b.id !== bookId));
  };

  return (
    <LibraryContext.Provider value={{ libraryBooks, addBook, removeBook }}>
      {children}
    </LibraryContext.Provider>
  );
}

export const useLibrary = () => useContext(LibraryContext);
