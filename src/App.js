import './App.css';
import React, { useEffect, useReducer } from 'react';
import { generateClient } from 'aws-amplify/api';
import { List, Input, Button } from 'antd';
import 'antd/dist/reset.css';
import { listNotes } from './graphql/queries';
import { v4 as uuid } from 'uuid';
import { onCreateNote } from './graphql/subscriptions';
import {
  updateNote as UpdateNote,
  createNote as CreateNote,
  deleteNote as DeleteNote
} from './graphql/mutations';

const CLIENT_ID = uuid();

const loadInitialState = () => {
  const savedNotes = localStorage.getItem('notes');
  return {
    notes: savedNotes ? JSON.parse(savedNotes) : [],
    loading: false,
    error: false,
    form: { name: '', description: '' }
  };
};

const initialState = loadInitialState();

const reducer = (state, action) => {
  let newState;
  switch (action.type) {
    case 'SET_NOTES':
      newState = { ...state, notes: action.notes, loading: false };
      break;
    case 'ADD_NOTE':
      newState = { ...state, notes: [action.note, ...state.notes]};
      break;
    case 'RESET_FORM':
      newState = { ...state, form: initialState.form };
      break;
    case 'SET_INPUT':
      newState = { ...state, form: { ...state.form, [action.name]: action.value } };
      break;
    case 'ERROR':
      newState = { ...state, loading: false, error: true };
      break;
    default:
      newState = state;
  }
  localStorage.setItem('notes', JSON.stringify(newState.notes));
  return newState;
}

const App = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const client = generateClient();

  const fetchNotes = async () => {
    try {
      const notesData = await client.graphql({
        query: listNotes
      });
      dispatch({ type: 'SET_NOTES', notes: notesData.data.listNotes.items });
    } catch (err) {
      console.log('error fetching notes:', err);
      dispatch({ type: 'ERROR' });
    }
  };

  const createNote = async () => {
    const { form } = state;
    if (!form.name || !form.description) {
      return alert('please enter a name and description');
    }
    const note = { ...form, clientId: CLIENT_ID, completed: false, id: uuid() }
    dispatch({ type: 'ADD_NOTE', note });
    dispatch({ type: 'RESET_FORM' });

    try {
      await client.graphql({
        query: CreateNote,
        variables: { input: note }
      });
      console.log('successfully created note!');
    } catch (err) {
      console.error("error creating note:", err);
    }
  };

  const deleteNote = async ({ id }) => {
    const index = state.notes.findIndex(n => n.id === id);
    const notes = [
      ...state.notes.slice(0, index),
      ...state.notes.slice(index + 1)
    ];
    dispatch({ type: 'SET_NOTES', notes });

    try {
      await client.graphql({
        query: DeleteNote,
        variables: { input: { id } }
      });
      console.log('successfully deleted note!');
    } catch (err) {
      console.log('error deleting note:', err);
    }
  };

  const updateNote = async (note) => {
    const index = state.notes.findIndex(n => n.id === note.id);
    const notes = [...state.notes];
    notes[index].completed = !note.completed;

    // Notes marked complete are moved to the end/bottom of the list.
    if (notes[index].completed) {
      const completedNote = notes.splice(index, 1)[0];
      notes.push(completedNote);
    }

    dispatch({ type: 'SET_NOTES', notes });
    try {
      await client.graphql({
        query: UpdateNote,
        variables: { input: { id: note.id, completed: notes[index].completed } }
      });
      console.log('note successfully updated!');
    } catch (err) {
      console.log('error updating note:', err);
    }
  };

  const onChange = (e) => {
    dispatch({ type: 'SET_INPUT', name: e.target.name, value: e.target.value });
  };

  useEffect(() => {
    if (!state.notes.length) {
      fetchNotes();
    }
    const subscription = client.graphql({
      query: onCreateNote
    }).subscribe({
      next: noteData => {
        const note = noteData.data.onCreateNote;
        if (CLIENT_ID === note.clientId) return;
        dispatch({ type: 'ADD_NOTE', note });
      },
      error: error => console.error(`Subscription error: ${error.message}`)
    });
    return () => subscription.unsubscribe();
  }, []);

  const styles = {
    container: { padding: 20 },
    input: { marginBottom: 10 },
    item: { textAlign: 'left' },
    p: { color: '#1890ff' },
    completedItem: { color: '#d3d3d3' } 
  };

  const renderItem = (item) => {
    
    const textStyles = item.completed ? { color: '#d3d3d3' } : { color: 'black' };
  
    return (
      <List.Item
        actions={[
          <p style={styles.p} onClick={() => deleteNote(item)}>Delete</p>,
          <p style={styles.p} onClick={() => updateNote(item)}>
            {item.completed ? 'Completed' : 'Mark completed'}
          </p>
        ]}
      >
        <List.Item.Meta
          title={<span style={textStyles}>{item.name}</span>} 
          description={<span style={textStyles}>{item.description}</span>} 
        />
      </List.Item>
    );
  };

  return (
    <div style={styles.container}>
      <Input
        onChange={onChange}
        value={state.form.name}
        placeholder="Note Name"
        name='name'
        style={styles.input}
      />
      <Input
        onChange={onChange}
        value={state.form.description}
        placeholder="Note description"
        name='description'
        style={styles.input}
      />
      <Button
        onClick={createNote}
        type="primary"
      >Create Note</Button>
      <List
        loading={state.loading}
        dataSource={state.notes}
        renderItem={renderItem}
      />
    </div>
  );
}

export default App;
