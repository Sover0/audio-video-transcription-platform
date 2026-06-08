import { useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import UploadPage from './pages/UploadPage';
import ResultPage from './pages/ResultPage';

function App() {
  const [isUploaded, setIsUploaded] = useState(false);
  const [transcriptionData, setTranscriptionData] = useState({
    transcript: '',
    speakers: [],
    summary: {
      core观点: '',
      outline: [],
      goldenSentences: [],
      tags: [],
      titles: [],
      extensionTopics: [],
    },
    duration: 0,
    audioUrl: '',
  });

  const handleUploadComplete = (data: any) => {
    setTranscriptionData(data);
    setIsUploaded(true);
  };

  const handleBackToUpload = () => {
    setIsUploaded(false);
  };

  const handleViewPreviousResult = () => {
    // 只有当有转录数据时才允许返回结果页面
    if (transcriptionData.transcript) {
      setIsUploaded(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        {!isUploaded ? (
          <UploadPage 
            onUploadComplete={handleUploadComplete}
            onViewPreviousResult={handleViewPreviousResult}
            hasPreviousResult={!!transcriptionData.transcript}
          />
        ) : (
          <ResultPage 
            data={transcriptionData} 
            onBackToUpload={handleBackToUpload} 
          />
        )}
      </main>
      <Footer />
    </div>
  );
}

export default App;