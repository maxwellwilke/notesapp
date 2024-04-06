import './App.css';
import React, {useEffect, useReducer} from 'react';
// V6: https://docs.amplify.aws/react/build-a-backend/graphqlapi/set-up-graphql-api/#add-your-first-record
import { generateClient } from 'aws-amplify/api';
import { List } from 'antd';
import 'antd/dist/reset.css';
import { listNotes } from './graphql/queries';

const initialState = {
  notes: [],
  loading: true,
  error: false,
  form: { name: '', description: '' }
}
const reducer = (state, action) => {
  switch(action.type) {
    case 'SET_NOTES':
      return { ...state, notes: action.notes, loading: false };
    case 'ERROR':
      return { ...state, loading: false, error: true };
    default:
      return { ...state};
  }
}

const App = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const client = generateClient();

  const fetchNotes = async() => {
    try {
      const notesData = await client.graphql({
        query: listNotes
      });
      dispatch({ type: 'SET_NOTES', notes: notesData.data.listNotes.items });
    } catch (err) {
      console.log('error: ', err);
      dispatch({ type: 'ERROR' });
    }
  };

  useEffect(() => {
    fetchNotes()
  }, []);

  const styles = {
    container: {padding: 20},
    input: {marginBottom: 10},
    item: { textAlign: 'left' },
    p: { color: '#1890ff' }
  };

  const renderItem = (item) => {
    return (
      <List.Item style={styles.item}>
        <List.Item.Meta
          title={item.name}
          description={item.description}
        />
      </List.Item>
    )
  };

  return (
    <div style={styles.container}>
        <List
          loading={state.loading}
          dataSource={state.notes}
          renderItem={renderItem}
        />
      </div>
  );
}

export default App;
