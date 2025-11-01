page.tsx:159 A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used:

- A server/client branch `if (typeof window !== 'undefined')`.
- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.

It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

https://react.dev/link/hydration-mismatch

  ...
    <InnerLayoutRouter url="/report-ge..." tree={[...]} cacheNode={{lazyData:null, ...}} segmentPath={[...]}>
      <ClientPageRoot Component={function ReportGeneratorPage} searchParams={{}} params={{}}>
        <ReportGeneratorPage params={Promise} searchParams={Promise}>
          <App>
            <div className="css-dev-on..." style={undefined}>
              <Notifications>
              <Notifications>
              <ReportGeneratorPageInternal>
                <div className="report-gen...">
                  <div style={{padding:"40px"}} className="printable-...">
                    <Card>
                      <div ref={null} className="ant-card a..." style={{}}>
                        <div className="ant-card-body" style={{}}>
                          <div
+                           className="jsx-c9a0b82f1ceb4cac non-printable"
-                           className="jsx-eb3feb732c72c546 non-printable"
                          >
                          ...
      ...