import * as React from 'react';

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 5000;

type Toast = {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: 'default' | 'destructive';
};

type ToasterToast = Toast & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: 'default' | 'destructive';
};

const actionTypes = {
  ADD_TOAST: 'ADD_TOAST',
  REMOVE_TOAST: 'REMOVE_TOAST',
} as const;

let memoryState: { toasts: ToasterToast[] } = { toasts: [] };

const listeners: Array<(state: { toasts: ToasterToast[] }) => void> = [];

const reducer = (state: { toasts: ToasterToast[] }, action: { type: keyof typeof actionTypes; toast?: ToasterToast; toastId?: string }) => {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [action.toast!, ...state.toasts].slice(0, TOAST_LIMIT),
      };
    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
    default:
      return state;
  }
};

const dispatch = (action: { type: keyof typeof actionTypes; toast?: ToasterToast; toastId?: string }) => {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
};

export const toast = ({ ...props }: Omit<ToasterToast, 'id'>) => {
  const id = `${Date.now()}-${Math.random()}`;

  const GgToast = {
    id,
    ...props,
  };

  dispatch({ type: 'ADD_TOAST', toast: GgToast });

  setTimeout(() => {
    dispatch({ type: 'REMOVE_TOAST', toastId: GgToast.id });
  }, TOAST_REMOVE_DELAY);
};

export function useToast() {
  const [state, setState] = React.useState(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    ...state,
  };
}
