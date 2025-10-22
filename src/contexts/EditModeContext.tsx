import { createContext, useContext, useState, ReactNode } from 'react';

interface EditModeContextType {
  editMode: boolean;
  setEditMode: (mode: boolean) => void;
}

const EditModeContext = createContext<EditModeContextType>({
  editMode: false,
  setEditMode: () => {},
});

export const EditModeProvider = ({ children }: { children: ReactNode }) => {
  const [editMode, setEditMode] = useState(false);

  return (
    <EditModeContext.Provider value={{ editMode, setEditMode }}>
      {children}
    </EditModeContext.Provider>
  );
};

export const useEditMode = () => {
  const context = useContext(EditModeContext);
  if (!context) {
    throw new Error('useEditMode must be used within EditModeProvider');
  }
  return context;
};
