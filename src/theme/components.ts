export const components = {
  Button:{baseStyle:{borderRadius:'12px',fontWeight:700,transition:'all .2s ease',_active:{transform:'scale(.98)'}},defaultProps:{colorScheme:'brand'}},
  Input:{defaultProps:{focusBorderColor:'brand.400'}}, Select:{defaultProps:{focusBorderColor:'brand.400'}}, Textarea:{defaultProps:{focusBorderColor:'brand.400'}},
  Modal:{baseStyle:{dialog:{bg:'panel',border:'1px solid',borderColor:'line',borderRadius:'22px'}},defaultProps:{motionPreset:'scale'}},
  Table:{baseStyle:{tr:{transition:'background .2s ease'},th:{letterSpacing:'.04em'}}},
};
