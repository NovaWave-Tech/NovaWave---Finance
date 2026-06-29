import {
  Alert,
  AlertIcon,
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
} from "@chakra-ui/react";
import type { ReactNode } from "react";

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  impact,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  colorScheme = "red",
  isLoading = false,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: ReactNode;
  itemName?: string;
  impact?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  colorScheme?: "red" | "orange" | "blue" | "green" | "purple";
  isLoading?: boolean;
  children?: ReactNode;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered motionPreset="scale">
      <ModalOverlay backdropFilter="blur(8px)" />
      <ModalContent borderRadius="2xl" bg="panel" border="1px solid" borderColor="line">
        <ModalHeader pr="12">{title}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text color="muted">{description}</Text>
          {itemName && (
            <Text mt="4" fontWeight="800" fontSize="lg">
              {itemName}
            </Text>
          )}
          {children}
          {impact && (
            <Alert status="warning" mt="5" borderRadius="xl" variant="subtle">
              <AlertIcon />
              <Text fontSize="sm">{impact}</Text>
            </Alert>
          )}
        </ModalBody>
        <ModalFooter gap="3">
          <Button variant="ghost" onClick={onClose} isDisabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            colorScheme={colorScheme}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
