import React, { createContext, useContext, useState } from "react";

const LibraryContext = createContext<any>(null);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [libraryBooks, setLibraryBooks] = useState<any[]>([]);

  const addBook = (book: any) => {
    setLibraryBooks((prev) => [book, ...prev]);
  };

  return (
    <LibraryContext.Provider value={{ libraryBooks, addBook }}>
      {children}
    </LibraryContext.Provider>
  );
}

export const useLibrary = () => useContext(LibraryContext);
