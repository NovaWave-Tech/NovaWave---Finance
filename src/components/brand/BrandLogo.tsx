import { Flex, Heading, Image, Text } from "@chakra-ui/react";
import mark from "../../assets/logos/novawave-finance-icon.svg";
export function BrandLogo({
  compact = false,
  inverse = false,
  size = 44,
}: {
  compact?: boolean;
  inverse?: boolean;
  size?: number;
}) {
  return (
    <Flex align="center" gap="3" aria-label="NovaWave Finance">
      <Image
        src={mark}
        alt=""
        w={`${size}px`}
        h={`${size}px`}
        flexShrink="0"
        filter="drop-shadow(0 10px 18px rgba(15,98,254,.22))"
      />
      {!compact && (
        <Flex direction="column" lineHeight="1">
          <Text
            fontSize={size >= 50 ? "9px" : "8px"}
            color={inverse ? "#A7B0C0" : "muted"}
            fontWeight="800"
            letterSpacing="2.3px"
          >
            NOVAWAVE
          </Text>
          <Heading
            mt="1"
            fontSize={size >= 50 ? "xl" : "md"}
            color={inverse ? "white" : "textMain"}
            letterSpacing="-.6px"
          >
            Finance
          </Heading>
        </Flex>
      )}
    </Flex>
  );
}
