---
description: How to add Skeleton loading to a component or page
---

1. **Import the Skeleton Component**:
   ```tsx
   import Skeleton from '@/app/components/ui/Skeleton';
   ```

2. **Identify the Loading State**:
   Locate the `if (loading) ...` block or the condition where the loading spinner is currently shown.

3. **Design the Skeleton Structure**:
   Create a structure that mimics the layout of the content being loaded.
   - Use `width` and `height` props to define shapes.
   - Use `style={{ borderRadius: '...' }}` for circles or rounded corners.
   - Use standard CSS or inline styles for layout (flexbox, grid, margins).

   **Example (List Item):**
   ```tsx
   if (loading) {
     return (
       <div className={styles.listContainer}>
         {[1, 2, 3].map((i) => (
           <div key={i} className={styles.item} style={{ marginBottom: '16px' }}>
             <Skeleton width={150} height={24} style={{ marginBottom: '8px' }} />
             <Skeleton width="100%" height={16} />
           </div>
         ))}
       </div>
     );
   }
   ```

   **Example (Card):**
   ```tsx
   if (loading) {
     return (
       <div className={styles.card}>
         <Skeleton width={50} height={50} style={{ borderRadius: '50%', marginBottom: '16px' }} />
         <Skeleton width="80%" height={24} style={{ marginBottom: '8px' }} />
         <Skeleton width="60%" height={16} />
       </div>
     );
   }
   ```

4. **Verify**:
   Ensure the skeleton structure matches the dimensions and layout of the actual content to prevent layout shifts.
