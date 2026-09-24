import React from "react";
import { Modal } from "react-native";
import CanteenManagementView from "./CanteenManagementView";

interface CanteenManagementModalProps {
  visible: boolean;
  onClose: () => void;
}

const CanteenManagementModal: React.FC<CanteenManagementModalProps> = ({
  visible,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <CanteenManagementView visible={visible} onClose={onClose} />
    </Modal>
  );
};

export default CanteenManagementModal;
