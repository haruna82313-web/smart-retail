import React, { useState } from 'react';
import SystemToast from './SystemToast';

export default function ShopClosedNotification({ onClose }) {
  const [showToast, setShowToast] = useState(true);

  const handleClose = () => {
    setShowToast(false);
    if (onClose) onClose();
  };

  return (
    <SystemToast
      message="Shop is currently closed. Please open the shop in the Admin Dashboard to perform this operation."
      type="warning"
      onClose={handleClose}
      duration={5000}
    />
  );
}
