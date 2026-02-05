# NativeWind Quick Reference

Quick reference guide for common Tailwind CSS utilities used with NativeWind in React Native.

## Layout

### Display & Flexbox
```
flex-1              flex: 1
flex-row            flexDirection: 'row'
flex-col            flexDirection: 'column'
items-start         alignItems: 'flex-start'
items-center        alignItems: 'center'
items-end           alignItems: 'flex-end'
items-stretch       alignItems: 'stretch'
justify-start       justifyContent: 'flex-start'
justify-center      justifyContent: 'center'
justify-end         justifyContent: 'flex-end'
justify-between     justifyContent: 'space-between'
justify-around      justifyContent: 'space-around'
justify-evenly      justifyContent: 'space-evenly'
```

### Position
```
absolute            position: 'absolute'
relative            position: 'relative'
top-0, bottom-0    top: 0, bottom: 0
left-0, right-0     left: 0, right: 0
z-10                zIndex: 10
```

### Width & Height
```
w-full              width: '100%'
w-screen            width: '100%'
h-full              height: '100%'
h-screen            height: '100%'
w-4, h-4            width: 16, height: 16
w-1/2               width: '50%'
h-1/2               height: '50%'
```

## Spacing

### Padding
```
p-0, p-1, p-2      padding: 0, 4, 8
p-4, p-6, p-8      padding: 16, 24, 32
px-4                paddingHorizontal: 16
py-4                paddingVertical: 16
pt-4, pb-4          paddingTop: 16, paddingBottom: 16
pl-4, pr-4          paddingLeft: 16, paddingRight: 16
```

### Margin
```
m-0, m-1, m-2      margin: 0, 4, 8
m-4, m-6, m-8      margin: 16, 24, 32
mx-4                marginHorizontal: 16
my-4                marginVertical: 16
mt-4, mb-4          marginTop: 16, marginBottom: 16
ml-4, mr-4          marginLeft: 16, marginRight: 16
```

### Gap (Space Between)
```
gap-2               gap: 8
gap-4               gap: 16
gap-x-4             columnGap: 16
gap-y-4             rowGap: 16
space-y-2           marginTop on children (except first)
space-x-2           marginLeft on children (except first)
```

## Typography

### Font Size
```
text-xs             fontSize: 12
text-sm             fontSize: 14
text-base           fontSize: 16
text-lg             fontSize: 18
text-xl             fontSize: 20
text-2xl            fontSize: 24
text-3xl            fontSize: 30
```

### Font Weight
```
font-thin           fontWeight: '100'
font-light           fontWeight: '300'
font-normal         fontWeight: '400'
font-medium         fontWeight: '500'
font-semibold       fontWeight: '600'
font-bold           fontWeight: '700'
font-extrabold      fontWeight: '800'
```

### Text Alignment
```
text-left           textAlign: 'left'
text-center         textAlign: 'center'
text-right          textAlign: 'right'
text-justify        textAlign: 'justify'
```

### Text Decoration
```
underline           textDecorationLine: 'underline'
line-through        textDecorationLine: 'line-through'
no-underline        textDecorationLine: 'none'
```

### Text Transform
```
uppercase           textTransform: 'uppercase'
lowercase           textTransform: 'lowercase'
capitalize          textTransform: 'capitalize'
```

## Colors

### Background Colors
```
bg-transparent      backgroundColor: 'transparent'
bg-white            backgroundColor: '#FFFFFF'
bg-black            backgroundColor: '#000000'
bg-gray-50          backgroundColor: '#F9FAFB'
bg-gray-100         backgroundColor: '#F3F4F6'
bg-gray-200         backgroundColor: '#E5E7EB'
bg-gray-300         backgroundColor: '#D1D5DB'
bg-gray-400         backgroundColor: '#9CA3AF'
bg-gray-500         backgroundColor: '#6B7280'
bg-gray-600         backgroundColor: '#4B5563'
bg-gray-700         backgroundColor: '#374151'
bg-gray-800         backgroundColor: '#1F2937'
bg-gray-900         backgroundColor: '#111827'

bg-blue-50          backgroundColor: '#EFF6FF'
bg-blue-100         backgroundColor: '#DBEAFE'
bg-blue-500         backgroundColor: '#3B82F6'
bg-blue-600         backgroundColor: '#2563EB'
bg-blue-700         backgroundColor: '#1D4ED8'

bg-green-500        backgroundColor: '#10B981'
bg-green-600        backgroundColor: '#059669'

bg-red-500          backgroundColor: '#EF4444'
bg-red-600          backgroundColor: '#DC2626'

bg-yellow-500       backgroundColor: '#F59E0B'
bg-yellow-600       backgroundColor: '#D97706'
```

### Text Colors
```
text-white          color: '#FFFFFF'
text-black          color: '#000000'
text-gray-400       color: '#9CA3AF'
text-gray-500       color: '#6B7280'
text-gray-600       color: '#4B5563'
text-gray-700       color: '#374151'
text-gray-900       color: '#111827'
text-blue-600       color: '#2563EB'
text-green-600      color: '#059669'
text-red-600        color: '#DC2626'
```

### Border Colors
```
border-gray-200     borderColor: '#E5E7EB'
border-gray-300     borderColor: '#D1D5DB'
border-blue-500     borderColor: '#3B82F6'
border-red-500      borderColor: '#EF4444'
```

## Borders

### Border Width
```
border              borderWidth: 1
border-0            borderWidth: 0
border-2            borderWidth: 2
border-4            borderWidth: 4
border-t            borderTopWidth: 1
border-b            borderBottomWidth: 1
border-l            borderLeftWidth: 1
border-r            borderRightWidth: 1
```

### Border Radius
```
rounded-none        borderRadius: 0
rounded             borderRadius: 4
rounded-sm          borderRadius: 2
rounded-md          borderRadius: 6
rounded-lg          borderRadius: 8
rounded-xl          borderRadius: 12
rounded-2xl         borderRadius: 16
rounded-full        borderRadius: 9999
rounded-t-lg        borderTopLeftRadius: 8, borderTopRightRadius: 8
rounded-b-lg        borderBottomLeftRadius: 8, borderBottomRightRadius: 8
```

## Effects

### Opacity
```
opacity-0           opacity: 0
opacity-25          opacity: 0.25
opacity-50          opacity: 0.5
opacity-75          opacity: 0.75
opacity-100         opacity: 1
```

### Shadow (iOS)
```
shadow-sm           shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05, shadowRadius: 2
shadow              shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.1, shadowRadius: 3
shadow-md           shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.1, shadowRadius: 6
shadow-lg           shadowColor: '#000', shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.1, shadowRadius: 15
shadow-xl           shadowColor: '#000', shadowOffset: {width: 0, height: 20}, shadowOpacity: 0.1, shadowRadius: 25
```

### Elevation (Android)
```
elevation-0         elevation: 0
elevation-1         elevation: 1
elevation-2         elevation: 2
elevation-4         elevation: 4
elevation-8         elevation: 8
```

## Overflow

```
overflow-hidden     overflow: 'hidden'
overflow-visible    overflow: 'visible'
overflow-scroll     overflow: 'scroll'
```

## Common Combinations

### Centered Container
```
flex-1 items-center justify-center
```

### Full Width Card
```
w-full bg-white rounded-lg p-4 shadow-md
```

### Button Base
```
px-6 py-3 rounded-lg items-center justify-center
```

### Input Base
```
border border-gray-300 rounded-lg px-4 py-3 text-base
```

### List Item
```
flex-row items-center justify-between p-4 border-b border-gray-200
```

### Section Header
```
text-lg font-semibold text-gray-900 mb-3
```

## React Native Specific Notes

1. **Shadows**: Use `shadow-*` classes for iOS, `elevation-*` for Android. For cross-platform, combine both:
   ```tsx
   className="shadow-lg elevation-4"
   ```

2. **Percentages**: Use `w-1/2` for 50% width, `h-1/3` for 33% height, etc.

3. **Safe Areas**: Use `react-native-safe-area-context` with NativeWind:
   ```tsx
   <SafeAreaView className="flex-1 bg-white">
   ```

4. **Platform Differences**: Some utilities may render differently on iOS vs Android. Test on both platforms.

5. **Dynamic Values**: For dynamic values not available as utilities, use inline styles:
   ```tsx
   <View className="p-4" style={{ width: customWidth }}>
   ```
