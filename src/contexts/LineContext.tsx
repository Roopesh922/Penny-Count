import React, { createContext, useContext, useEffect, useState } from 'react';
import { Line } from '../types';
import { useAuth } from './AuthContext';
import { dataService } from '../services/dataService';

interface LineContextType {
  selectedLine: Line | null;
  availableLines: Line[];
  isLoading: boolean;
  selectLine: (lineId: string) => void;
  refreshLines: () => Promise<void>;
  showLineSelector: boolean;
  setShowLineSelector: (show: boolean) => void;
}

const LineContext = createContext<LineContextType | undefined>(undefined);

export const useLineContext = () => {
  const context = useContext(LineContext);
  if (context === undefined) {
    throw new Error('useLineContext must be used within a LineProvider');
  }
  return context;
};

const LINE_STORAGE_KEY = 'penny-count-agent-line';

export const LineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [selectedLine, setSelectedLine] = useState<Line | null>(null);
  const [availableLines, setAvailableLines] = useState<Line[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLineSelector, setShowLineSelector] = useState(false);

  const loadLines = async () => {
    if (!user || user.role !== 'agent') {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const allLines = await dataService.getLines();
      const agentLines = allLines.filter(line => line.agentId === user.id);
      setAvailableLines(agentLines);

      if (agentLines.length === 0) {
        setIsLoading(false);
        return;
      }

      const storedLineId = localStorage.getItem(LINE_STORAGE_KEY);

      if (storedLineId) {
        const storedLine = agentLines.find(line => line.id === storedLineId);
        if (storedLine) {
          setSelectedLine(storedLine);
          setIsLoading(false);
          return;
        }
      }

      if (agentLines.length === 1) {
        setSelectedLine(agentLines[0]);
        localStorage.setItem(LINE_STORAGE_KEY, agentLines[0].id);
      } else {
        setShowLineSelector(true);
      }

      setIsLoading(false);
    } catch (error) {
            setIsLoading(false);
    }
  };

  const selectLine = (lineId: string) => {
    const line = availableLines.find(l => l.id === lineId);
    if (line) {
      setSelectedLine(line);
      localStorage.setItem(LINE_STORAGE_KEY, lineId);
      setShowLineSelector(false);
    }
  };

  const refreshLines = async () => {
    await loadLines();
  };

  useEffect(() => {
    if (user) {
      loadLines();
    } else {
      setSelectedLine(null);
      setAvailableLines([]);
      localStorage.removeItem(LINE_STORAGE_KEY);
    }
  }, [user?.id]);

  return (
    <LineContext.Provider
      value={{
        selectedLine,
        availableLines,
        isLoading,
        selectLine,
        refreshLines,
        showLineSelector,
        setShowLineSelector
      }}
    >
      {children}
    </LineContext.Provider>
  );
};
