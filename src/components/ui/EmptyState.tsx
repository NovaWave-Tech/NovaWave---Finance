import { Center, Heading, Text, type CenterProps } from "@chakra-ui/react";
export function EmptyState({
  title,
  description,
  ...props
}: CenterProps & { title: string; description?: string }) {
  return (
    <Center flexDir="column" py="12" {...props}>
      <Heading size="sm">{title}</Heading>
      {description && (
        <Text color="muted" mt="2">
          {description}
        </Text>
      )}
    </Center>
  );
}
