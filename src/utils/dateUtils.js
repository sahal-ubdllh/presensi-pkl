import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export const getCurrentMonthYear = () => {
  return format(new Date(), 'MMMM yyyy', { locale: id });
};

export const formatDate = (date) => {
  return format(new Date(date), 'dd MMMM yyyy', { locale: id });
};

export const formatDateShort = (date) => {
  return format(new Date(date), 'dd/MM/yyyy');
};

export const formatTime = (date) => {
  return format(new Date(date), 'HH:mm');
};

export const getTodayString = () => {
  return format(new Date(), 'yyyy-MM-dd');
};