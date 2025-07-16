//Router.js
import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useUserStore } from '../src/store/userStore';  // Import the store
import { getData } from '../utils/storage';  // Assuming getData is imported from utils

// Import your components/pages
import HomePage from '../src/userComponents/HomePage';
import SingleProduct from '../src/userComponents/SingleProduct';
import WishlistPage from '../src/userComponents/wishlist';
import Cart from '../src/userComponents/cart';
import Shop from '../src/userComponents/Shop';
import Profile from '../src/userComponents/Profile';
import OrderDetails from '../src/userComponents/OrderDetails';
import OrdersList from '../src/userComponents/OrderList';
import Order from '../src/userComponents/Order';
import UserLogin from '../src/userComponents/UserLogin';
import Dashboard from '../components/Admin/Navbar';
import Register from "../src/userComponents/Register";
import ShopCategory from "../src/userComponents/ShopCategory";
import AllProducts from "../src/userComponents/AllProducts";
import Layout from '../src/components/Layout';
import VoucherCards from "../src/userComponents/VoucherCards";
import Wallet from "../src/userComponents/Wallet";
import SalesManNavbars from "../components/Salesman/SalesManNavbars";
import OrderTracking from "../src/userComponents/TrackOrder";
import ChatBot from "../src/userComponents/ChatBot";
import LanguageScreen from '../components/User/LanguageScreen';
import CameraScreen from "../src/userComponents/CameraScreen";
import TodaysDeals from '../src/userComponents/TodaysDeals';     
import EventComponent from '../src/userComponents/Events';
import BiddingCard from '../src/userComponents/biddingCard';
const Stack = createStackNavigator();

const MainRouter = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { loadUserFromStorage } = useUserStore();

  useEffect(() => {
    const checkAuthStatus = async () => {
      await loadUserFromStorage();
      const token = await getData('token');
      setIsAuthenticated(!!token);
    };
    checkAuthStatus();
  }, []);

  return (
    <Stack.Navigator
      initialRouteName="HomePage"
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* Wrap each screen in the Layout component */}
      <Stack.Screen name="HomePage">
        {props => (
          <Layout>
            <HomePage {...props} />
          </Layout>
        )}
      </Stack.Screen>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="UserLogin">
            {props => (
              <Layout>
                <UserLogin {...props} />
              </Layout>
            )}
          </Stack.Screen>
          <Stack.Screen name="register">
            {props => (
              <Layout>
                <Register {...props} />
              </Layout>
            )}
          </Stack.Screen>
        </>
      ) : null}
      <Stack.Screen name="Profile">
        {props => (
          <Layout>
            <Profile {...props} />
          </Layout>
        )}
      </Stack.Screen>
      <Stack.Screen name="SingleProduct">
        {props => (
          <Layout>
            <SingleProduct {...props} />
          </Layout>
        )}
      </Stack.Screen>
      <Stack.Screen name="ShopCategory">
        {props => (
          <Layout>
            <ShopCategory {...props} />
          </Layout>
        )}
      </Stack.Screen>
      <Stack.Screen name="Cart">
        {props => (
          <Layout>
            <Cart {...props} />
          </Layout>
        )}
      </Stack.Screen>
      <Stack.Screen name="WishlistPage">
        {props => (
          <Layout>
            <WishlistPage {...props} />
          </Layout>
        )}
      </Stack.Screen>
      <Stack.Screen name="Shop">
        {props => (
          <Layout>
            <Shop {...props} />
          </Layout>
        )}
      </Stack.Screen>
      <Stack.Screen name="OrdersList">
        {props => (
          <Layout>
            <OrdersList {...props} />
          </Layout>
        )}
      </Stack.Screen>
      <Stack.Screen name="Order">
        {props => (
          <Layout>
            <Order {...props} />
          </Layout>
        )}
      </Stack.Screen>
      <Stack.Screen name="OrderDetails">
        {props => (
          <Layout>
            <OrderDetails {...props} />
          </Layout>
        )}
      </Stack.Screen>
      <Stack.Screen name="OrderTracking">
        {props => (
          <Layout>

            <OrderTracking {...props} />
          </Layout>

        )}
      </Stack.Screen>
      <Stack.Screen name="Wallet">
        {props => (
          <Layout>
            <Wallet {...props} />
          </Layout>
        )}
      </Stack.Screen>
      <Stack.Screen name="AllProducts">
        {props => (
          <Layout>
            <AllProducts {...props} />
          </Layout>
        )}
      </Stack.Screen>
      <Stack.Screen name="VoucherCards">
        {props => (
          <Layout>
            <VoucherCards {...props} />
          </Layout>
        )}
      </Stack.Screen>
      <Stack.Screen name="AdminNavbar">
        {props => (
          <Dashboard {...props} />
        )}
      </Stack.Screen>
      <Stack.Screen name="SalesManNavbars">
        {props => (
          <SalesManNavbars {...props} />
        )}
      </Stack.Screen>
      <Stack.Screen name="ChatBot">
        {props => (
            <ChatBot {...props} />
        )}
      </Stack.Screen>
      <Stack.Screen name="LanguageScreen">
        {props => (
            <LanguageScreen {...props} />
        )}
      </Stack.Screen>
      <Stack.Screen name="CameraScreen"> 
        {props => (
            <CameraScreen {...props} />
        )}
      </Stack.Screen>
      <Stack.Screen name="TodaysDeals">
        {props => (
          <Layout>
            <TodaysDeals {...props} />
          </Layout>
        )}
      </Stack.Screen>
      <Stack.Screen name="Events">
        {props => (
          <Layout>
            <EventComponent {...props} />
          </Layout>
        )}
      </Stack.Screen>
      <Stack.Screen name="BiddingCard"> 
        {props => (
            <BiddingCard {...props} />
        )}
      </Stack.Screen>
    </Stack.Navigator>
    
  );
};

export default MainRouter;