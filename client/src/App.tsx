import { ThemeProvider } from "@/components/theme-provider";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import Register from "@/pages/register";
import NotFound from "@/pages/not-found";
import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch } from "wouter";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/trash" component={Dashboard} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/history" component={Dashboard} />
          <Route>{() => <NotFound />}</Route>
        </Switch>
      </ThemeProvider>
    </QueryClientProvider>
  );
}


