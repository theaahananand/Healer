import React from 'react';
import { useNavigate } from 'react-router-dom';

const SearchMedicines = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>Search Medicines</h1>
      <p>This is a standalone search page (work in progress)</p>
      <button onClick={() => navigate('/')}>Go Home</button>
    </div>
  );
};

export default SearchMedicines;
