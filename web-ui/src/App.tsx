import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { TopicForm } from './components/TopicForm';
import { TopicList } from './components/TopicList';
import { Metrics } from './components/Metrics';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route
            path="/"
            element={
              <div className="container">
                <TopicForm />
                <TopicList />
              </div>
            }
          />
          <Route path="/metrics" element={<Metrics />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
