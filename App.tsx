
import React, { useState, useCallback } from 'react';
import PincodeSearchForm from './components/PincodeSearchForm.tsx';
import ResultsGrid from './components/ResultsTable.tsx';
import Spinner from './components/Spinner.tsx';
import ErrorMessage from './components/ErrorMessage.tsx';
import GroundingSources from './components/GroundingSources.tsx';
import { fetchBusinessesByPincode } from './services/geminiService.ts';
import { Business, Source } from './types.ts';

const App: React.FC = () => {
  const [pincode, setPincode] = useState<string>('');
  const [area, setArea] = useState<string>('');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMoreLoading, setIsMoreLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(false);

  const handleSearch = useCallback(async () => {
    if (pincode.length !== 6) {
      setError("Please enter a valid 6-digit pincode.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setBusinesses([]);
    setSources([]);
    setHasSearched(true);
    setHasMore(false);

    try {
      const { businesses: results, sources: newSources } = await fetchBusinessesByPincode(pincode, area);
      setBusinesses(results);
      setSources(newSources);
      if (results.length > 0 && results.length === 30) {
        setHasMore(true);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [pincode, area]);

  const handleLoadMore = useCallback(async () => {
    setIsMoreLoading(true);
    setError(null);

    try {
      const existingNames = businesses.map(b => b.name);
      const { businesses: newResults, sources: newSources } = await fetchBusinessesByPincode(pincode, area, existingNames);
      
      const uniqueNewResults = newResults.filter(
        (newBusiness) => !businesses.some(existingBusiness => existingBusiness.name === newBusiness.name)
      );

      if (uniqueNewResults.length > 0) {
        setBusinesses(prev => [...prev, ...uniqueNewResults]);
      }
      
       if (newSources.length > 0) {
        setSources(prev => {
            const allSources = [...prev, ...newSources];
            return Array.from(new Map(allSources.map(s => [s.uri, s])).values());
        });
      }
      
      if(newResults.length < 30) { 
        setHasMore(false);
      }

    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("An unknown error occurred.");
      }
       setHasMore(false);
    } finally {
      setIsMoreLoading(false);
    }
  }, [pincode, area, businesses]);


  const renderResults = () => {
    if (isLoading) {
      return <Spinner />;
    }
    if (error && businesses.length === 0) {
      return <ErrorMessage message={error} />;
    }
    if (hasSearched) {
      if (businesses.length > 0) {
        return (
          <>
            <ResultsGrid businesses={businesses} />
            <div className="mt-8 text-center">
              <GroundingSources sources={sources} />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 italic">
                Business information is AI-generated and may not be fully up-to-date. Please verify details directly with the business.
              </p>
              <div className="mt-8">
              {hasMore && (
                 <button
                    onClick={handleLoadMore}
                    disabled={isMoreLoading}
                    className="px-6 py-3 text-lg font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-300 disabled:cursor-not-allowed transition-all duration-300"
                 >
                    {isMoreLoading ? 'Loading More...' : 'Load More Results'}
                 </button>
              )}
               {isMoreLoading && <div className="mt-4"><Spinner /></div>}
               {!hasMore && hasSearched && businesses.length > 0 && (
                <p className="text-gray-500 mt-4">End of results.</p>
              )}
              {error && businesses.length > 0 && <div className="mt-4"><ErrorMessage message={error} /></div>}
              </div>
            </div>
          </>
        );
      }
      return (
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <p className="text-gray-600 dark:text-gray-400">
            No businesses found for pincode <span className="font-semibold text-gray-800 dark:text-white">{pincode}</span>
            {area && (
              <>
                {' '}in area <span className="font-semibold text-gray-800 dark:text-white">{area}</span>
              </>
            )}
            . Try another search.
          </p>
        </div>
      );
    }
    return (
      <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-white mb-2">Welcome!</h2>
        <p className="text-gray-500 dark:text-gray-400">Enter a pincode for South Delhi, Noida, Greater Noida, or Ghaziabad to find local businesses.</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans">
      <main className="container mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white">
            Local Business Finder
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Your AI-powered guide to businesses in your neighborhood.
          </p>
        </div>

        <div className="mb-8">
          <PincodeSearchForm
            pincode={pincode}
            setPincode={setPincode}
            area={area}
            setArea={setArea}
            onSearch={handleSearch}
            isLoading={isLoading}
          />
        </div>

        <div className="max-w-4xl mx-auto">
          {renderResults()}
        </div>
      </main>
    </div>
  );
};

export default App;